package website.omniyap.app

import android.Manifest
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.io.FileNotFoundException

/**
 * OmniYap for Android.
 *
 * Electron cannot run on Android, so this is a WebView shell with the same job as the desktop
 * preload: load Yapper and inject dist/renderer.js before the page's own scripts run. That is done
 * with WebViewCompat.addDocumentStartJavaScript (Chromium 83+), which executes in the page's main
 * world. On older WebViews it falls back to onPageStarted, where the loader's late-injection path
 * takes over (DOM plugins work; module discovery is partial).
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermission: PermissionRequest? = null
    private var rendererScript = ""
    private val documentStartSupported by lazy {
        WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
    }

    private val fileChooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = filePathCallback ?: return@registerForActivityResult
        filePathCallback = null
        callback.onReceiveValue(
            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        )
    }

    private val recordAudioPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        pendingWebPermission?.let { request ->
            if (it) request.grant(request.resources) else request.deny()
            pendingWebPermission = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            setBackgroundColor(0xFF15151F.toInt())
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = "${settings.userAgentString} OmniYap/${BuildConfig.VERSION_NAME} YapperDesktop/${BuildConfig.VERSION_NAME}"
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
        }
        setContentView(webView)

        installRenderer()
        configureClients()
        handleBackNavigation()

        if (savedInstanceState == null) {
            webView.loadUrl(SITE)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private fun installRenderer() {
        rendererScript = try {
            assets.open("renderer.js").bufferedReader().use { it.readText() }
        } catch (err: FileNotFoundException) {
            android.util.Log.e("OmniYap", "renderer.js missing from assets — run npm run build", err)
            ""
        }
        if (rendererScript.isEmpty()) return

        if (documentStartSupported) {
            WebViewCompat.addDocumentStartJavaScript(webView, rendererScript, setOf(ORIGIN))
        }
        // Older WebViews are handled in onPageStarted below: inject as early as possible and let the
        // loader's late-injection path recover the runtime.
    }

    private fun configureClients() {
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val wantsAudio = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (wantsAudio && ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingWebPermission = request
                    recordAudioPermission.launch(Manifest.permission.RECORD_AUDIO)
                    return
                }
                request.grant(request.resources)
            }

            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    fileChooser.launch(params.createIntent())
                    true
                } catch (err: Exception) {
                    filePathCallback = null
                    false
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val host = url.host ?: return false
                if (host == "yapper.website" || host.endsWith(".yapper.website")) return false
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                if (!documentStartSupported && url != null && url.startsWith(ORIGIN) && rendererScript.isNotEmpty()) {
                    view.evaluateJavascript(rendererScript, null)
                }
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                webView.evaluateJavascript(
                    "window.OmniYap && console.log('[OmniYap] android shell ready', window.OmniYap.version)",
                    null
                )
            }
        }

        webView.setDownloadListener { downloadUrl, _, contentDisposition, mimeType, _ ->
            val request = DownloadManager.Request(Uri.parse(downloadUrl))
            request.setMimeType(mimeType)
            request.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(downloadUrl) ?: "")
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            request.setDestinationInExternalPublicDir(
                android.os.Environment.DIRECTORY_DOWNLOADS,
                URLUtil.guessFileName(downloadUrl, contentDisposition, mimeType)
            )
            (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        }
    }

    private fun handleBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val SITE = "https://www.yapper.website/"
        private const val ORIGIN = "https://www.yapper.website"
    }
}
