# OmniYap on Android

Electron cannot run on Android, so OmniYap's Android target is a small Kotlin WebView shell that
loads Yapper and injects the **same** `dist/renderer.js` as the desktop app.

**Status:** the debug APK builds with `bash scripts/android-build.sh` (verified: `app-debug.apk`, 2.4 MB,
with the 152 KB renderer bundle in `assets/`), but it has not been run on a device or emulator yet.
Treat the list below as what the shell implements, not as device-tested behaviour.

## What it implements

- Yapper's mobile web client inside a full-screen WebView, with persistent cookies and DOM storage.
- The full OmniYap plugin runtime (97 plugins) injected at document start through
  `WebViewCompat.addDocumentStartJavaScript`, which runs in the page's main world on Chromium 83+.
- Microphone for voice channels, camera, file uploads and downloads through Android's picker and
  DownloadManager.
- Back gesture navigates Yapper history, then exits.
- `omniyap://` deep links are declared in the manifest.

## Limitations

- **Screen sharing** has no equivalent of the desktop picker. Android WebView does not expose
  `getDisplayMedia`; Yapper will offer its browser flow where available.
- On WebViews older than 83 the script can only be injected in `onPageStarted`. The loader detects
  late injection, DOM/plugins still work, but Turbopack module discovery is partial (see
  `lateInjection` in Diagnostics).
- No tray, no taskbar badge, no OS-level notification actions. Notifications fall back to Android's
  WebView behaviour.
- A WebView is not Chromium-the-app: some desktop-only Yapper features may be hidden by the site's
  own user-agent checks. OmniYap appends `OmniYap/<version> YapperDesktop/<version>` to the UA, but
  the site may still choose its mobile layout.

## Build

Requirements: JDK 17+ **with `jlink`** (the Android Gradle plugin needs it; a headless JRE is not enough),
Android SDK (platform 35, build-tools 35.0.0). Android Studio is the easiest route; a headless script is
included that installs the SDK, Gradle and, when `jlink` is missing, a Temurin JDK 21 under
`.research/jdk` — all project-local, nothing system-wide.

```bash
npm run build                       # produces dist/renderer.js
cd android
./gradlew assembleDebug             # or: gradle assembleDebug
```

The Gradle build copies `dist/renderer.js` into `app/src/main/assets/` automatically (`copyRenderer`
task) and fails with a clear message if the bundle is missing.

Headless, project-local SDK install:

```bash
bash scripts/android-build.sh
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Project layout

```
android/
  settings.gradle.kts
  build.gradle.kts
  app/build.gradle.kts                  copyRenderer task, SDK levels, dependencies
  app/src/main/AndroidManifest.xml      internet, mic, camera, notifications
  app/src/main/java/website/omniyap/app/MainActivity.kt
  app/src/main/res/                     theme, strings, launcher icons
```

`MainActivity` mirrors what `src/preload/index.js` does on desktop:

1. create a WebView with JavaScript, DOM storage and media autoplay enabled,
2. read `assets/renderer.js`,
3. register it with `addDocumentStartJavaScript(webView, script, setOf("https://www.yapper.website"))`,
4. grant microphone/camera permission requests from Yapper, wire the file chooser and downloads,
5. keep external links out of the WebView (they open in the system browser).

## Distribution

Sideloading the debug APK is fine for personal use. Shipping on Google Play would need a release
key, a privacy policy, and a review of Yapper's terms regarding third-party clients. Build a release
with your own keystore:

```bash
cd android
./gradlew assembleRelease   # configure signingConfigs first
```
