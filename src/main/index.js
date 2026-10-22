'use strict';
// OmniYap main process: a Yapper window with the desktop features a browser tab cannot do
// (tray, notifications, screen sharing picker, deep links) plus the mod bridge that injects
// the OmniYap renderer into the page before Yapper boots.
const {
    app, BrowserWindow, Menu, Tray, nativeImage, shell, session, desktopCapturer,
    ipcMain, Notification, dialog, clipboard,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { Settings, dataDir } = require('./settings');

const SITE = 'https://www.yapper.website';
const ALLOWED = new Set(['www.yapper.website', 'yapper.website', 'rt.yapper.website', 'lk.yapper.website']);
// Links come from message content, so anything opened in the user's browser must be a web (or mail)
// URL. Handing an arbitrary scheme to the OS would let a message launch local files or protocol
// handlers such as search-ms: or ms-msdt:.
const EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:']);
const isExternalLink = (url) => {
    try {
        return EXTERNAL_SCHEMES.has(new URL(String(url)).protocol);
    } catch {
        return false;
    }
};
const IS_DEV = !app.isPackaged;
const VERSION = require('../../package.json').version;
// build.mjs copies the icons into dist/, which is packaged inside the asar.
const ICON = path.join(__dirname, '../../dist/icon.png');
const TRAY_ICON = path.join(__dirname, '../../dist/tray.png');
const PRELOAD = path.join(__dirname, '../preload/index.js');

const settings = new Settings();

let win = null;
let tray = null;
let quitting = false;
let everShown = false;
const startHidden = process.argv.includes('--hidden') || !!settings.get('omniyap.startMinimized');
let lastUrl = SITE;

// ---------------------------------------------------------------------------------------------
// Renderer bundle
// ---------------------------------------------------------------------------------------------

let bundleCache = null;
let bundleMtime = 0;

/** The mod runtime, read from disk. Cached until the file changes (hot-reload during development). */
function getBundle() {
    const file = path.join(__dirname, '../../dist/renderer.js');
    try {
        const stat = fs.statSync(file);
        if (!bundleCache || stat.mtimeMs !== bundleMtime) {
            bundleCache = fs.readFileSync(file, 'utf8');
            bundleMtime = stat.mtimeMs;
        }
        return bundleCache;
    } catch (err) {
        console.error('[omniyap] renderer bundle missing — run `npm run build`', err.message);
        return '';
    }
}

function buildHash() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '../../dist/build.json'), 'utf8')).hash;
    } catch {
        return 'dev';
    }
}

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

function hostOf(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}

function fromYapper(event) {
    return ALLOWED.has(hostOf(event?.senderFrame?.url ?? event?.sender?.getURL?.() ?? ''));
}

function show() {
    if (!win || win.isDestroyed()) {
        createWindow();
        win?.once('ready-to-show', () => win?.show());
        return;
    }
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
}

function loadSite(url) {
    if (!win || win.isDestroyed()) return;
    lastUrl = url;
    win.loadURL(url).catch(() => undefined);
}

function openDeepLink(url) {
    if (!win || typeof url !== 'string' || !url.startsWith('omniyap://')) return;
    const rest = url.slice('omniyap://'.length).replace(/^\/+/, '');
    loadSite(rest ? `${SITE}/${rest}` : SITE);
    show();
}

// ---------------------------------------------------------------------------------------------
// Offline / crash screen (never an endless blank window)
// ---------------------------------------------------------------------------------------------

let loadTimer = null;
let errorPage = false;

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function errorHtml(title, detail) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>OmniYap</title><style>
html,body{margin:0;height:100%;background:#15151f;color:#ececf1;font:15px/1.45 system-ui,sans-serif}
body{display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center}
.card{max-width:400px}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;color:#a3a6ad}
a.btn{display:inline-block;padding:10px 22px;border-radius:8px;background:#8b39fd;color:#fff;font-weight:600;text-decoration:none}
a.alt{display:block;margin-top:14px;color:#a3a6ad;font-size:13px}
code{display:block;margin-top:22px;color:#6c6f77;font-size:12px}
</style></head><body><div class="card"><h1>${escapeHtml(title)}</h1>
<p>Check your internet connection. A VPN, proxy or antivirus can also block Yapper.</p>
<a class="btn" id="retry" href="${escapeHtml(lastUrl)}">Retry</a>
<a class="alt" href="${SITE}" target="_blank">Open Yapper in your browser</a>
${detail ? `<code>${escapeHtml(detail)}</code>` : ''}
</div><script>addEventListener('online',()=>location.reload());</script></body></html>`;
}

function showLoadError(title, detail) {
    if (!win || win.isDestroyed()) return;
    clearTimeout(loadTimer);
    loadTimer = null;
    errorPage = true;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml(title, detail))}`).catch(() => undefined);
    if (win.isVisible() || (!startHidden && !everShown)) show();
}

// ---------------------------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------------------------

function createWindow() {
    const saved = settings.get('window') || {};
    win = new BrowserWindow({
        width: saved.width || 1280,
        height: saved.height || 840,
        x: Number.isInteger(saved.x) ? saved.x : undefined,
        y: Number.isInteger(saved.y) ? saved.y : undefined,
        minWidth: 480,
        minHeight: 360,
        backgroundColor: '#15151f',
        icon: ICON,
        autoHideMenuBar: true,
        show: false,
        title: 'OmniYap',
        webPreferences: {
            preload: PRELOAD,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: !!settings.get('omniyap.spellcheck', true),
            backgroundThrottling: false,
        },
    });

    if (saved.maximized) win.maximize();
    win.once('ready-to-show', () => {
        if (!startHidden) win.show();
    });
    win.on('show', () => {
        everShown = true;
    });

    const wc = win.webContents;

    wc.on('did-start-navigation', (details) => {
        if (!details.isMainFrame || details.isSameDocument || details.url.startsWith('data:')) return;
        lastUrl = details.url;
        errorPage = false;
        clearTimeout(loadTimer);
        loadTimer = setTimeout(() => showLoadError('Yapper is taking too long to load', 'Timed out after 20 s'), 20_000);
    });
    wc.on('dom-ready', () => {
        if (errorPage) return;
        clearTimeout(loadTimer);
        loadTimer = null;
        if (!startHidden && !everShown) win.show();
    });
    wc.on('did-fail-load', (_event, code, desc, url, isMainFrame) => {
        if (!isMainFrame || code === -3 || String(url).startsWith('data:')) return;
        showLoadError("Can't reach Yapper", `${desc || 'Load failed'} (${code})`);
    });
    wc.on('render-process-gone', (_event, details) => {
        if (details.reason === 'clean-exit') return;
        showLoadError('Yapper stopped working', `Page ${details.reason}${details.exitCode ? ` (${details.exitCode})` : ''}`);
    });

    // Desktop conveniences: F11 fullscreen, Ctrl+, opens OmniYap settings, Ctrl+Shift+I devtools.
    wc.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        const ctrl = input.control || input.meta;
        if (input.key === 'F11') {
            event.preventDefault();
            win.setFullScreen(!win.isFullScreen());
        } else if (input.key === 'Escape' && win.isFullScreen()) {
            wc.executeJavaScript('!!document.fullscreenElement && (document.exitFullscreen().catch(() => {}), true)', true)
                .then((wasHtml) => {
                    if (wasHtml && win.isFullScreen()) win.setFullScreen(false);
                })
                .catch(() => undefined);
        } else if (ctrl && !input.alt && input.key === ',') {
            event.preventDefault();
            wc.send('oy:open-settings');
        } else if (ctrl && input.shift && String(input.key).toLowerCase() === 'i') {
            event.preventDefault();
            wc.toggleDevTools();
        }
    });

    loadSite(SITE);

    wc.setWindowOpenHandler(({ url }) => {
        if (errorPage) {
            if (/^https:\/\//.test(url) && isExternalLink(url)) void shell.openExternal(url);
            return { action: 'deny' };
        }
        try {
            if (ALLOWED.has(new URL(url).hostname)) {
                loadSite(url);
                return { action: 'deny' };
            }
        } catch {
            /* not a URL */
        }
        if (isExternalLink(url)) void shell.openExternal(url);
        return { action: 'deny' };
    });

    wc.on('will-navigate', (event, url) => {
        try {
            if (!ALLOWED.has(new URL(url).hostname)) {
                event.preventDefault();
                if (isExternalLink(url)) void shell.openExternal(url);
            }
        } catch {
            event.preventDefault();
        }
    });

    win.on('close', (event) => {
        if (!quitting && settings.get('omniyap.minimizeToTray', true) && settings.get('omniyap.tray', true)) {
            event.preventDefault();
            saveWindowState();
            win.hide();
            return;
        }
        saveWindowState();
    });
    win.on('closed', () => {
        win = null;
    });

    return win;
}

function saveWindowState() {
    if (!win || win.isDestroyed()) return;
    const max = win.isMaximized();
    const bounds = max ? (settings.get('window') || {}) : win.getBounds();
    settings.patch({
        window: {
            width: max ? settings.get('window.width', 1280) : bounds.width,
            height: max ? settings.get('window.height', 840) : bounds.height,
            x: max ? settings.get('window.x', null) : bounds.x,
            y: max ? settings.get('window.y', null) : bounds.y,
            maximized: max,
        },
    });
}

// ---------------------------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------------------------

function createTray() {
    if (!settings.get('omniyap.tray', true)) return;
    let image = nativeImage.createFromPath(TRAY_ICON);
    if (image.isEmpty()) image = nativeImage.createEmpty();
    tray = new Tray(image.resize({ width: 20, height: 20 }));
    tray.setToolTip('OmniYap');
    const menu = Menu.buildFromTemplate([
        { label: 'Open Yapper', click: show },
        { label: 'OmniYap Settings…', accelerator: 'CmdOrCtrl+,', click: () => { show(); win?.webContents.send('oy:open-settings'); } },
        { type: 'separator' },
        { label: 'Reload', click: () => win?.webContents.reload() },
        { label: 'Toggle DevTools', click: () => win?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Quit OmniYap', click: () => { quitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.on('click', show);
    tray.on('double-click', show);
}

function refreshTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
    createTray();
}

// ---------------------------------------------------------------------------------------------
// Permissions, screen sharing and request tweaks
// ---------------------------------------------------------------------------------------------

let pendingPick = null;
const SOURCE_ID = /^(screen|window):[\w:-]{1,64}$/;
const PICK_TTL = 30_000;

function windowKey(id) {
    return String(id).split(':').slice(0, 2).join(':');
}

function ownWindowKey() {
    try {
        return win && typeof win.getMediaSourceId === 'function' ? windowKey(win.getMediaSourceId()) : '';
    } catch {
        return '';
    }
}

function setupSession() {
    const ses = session.defaultSession;

    ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
        let host = '';
        try {
            host = new URL(details.requestingUrl || '').hostname;
        } catch {
            /* ignore */
        }
        const allowed = ALLOWED.has(host) && [
            'media', 'notifications', 'display-capture', 'clipboard-read',
            'clipboard-sanitized-write', 'fullscreen', 'speaker-selection',
        ].includes(permission);
        callback(allowed);
    });
    ses.setPermissionCheckHandler((_wc, _permission, origin) => {
        try {
            return ALLOWED.has(new URL(origin).hostname);
        } catch {
            return false;
        }
    });

    // Same flow as the official desktop app: the site shows its own picker, sends us the choice,
    // and the next getDisplayMedia call uses it. Without a pick we share the primary screen.
    ses.setDisplayMediaRequestHandler(async (request, callback) => {
        try {
            const picked = pendingPick;
            pendingPick = null;
            const fresh = picked && Date.now() - picked.at < PICK_TTL ? picked.id : null;
            if (request?.frame && !ALLOWED.has(hostOf(request.frame.url))) return callback({});
            const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
            const chosen = fresh && sources.find((s) => s.id === fresh);
            if (chosen) {
                const loopback = chosen.id.startsWith('screen:') && process.platform === 'win32';
                return callback(loopback ? { video: chosen, audio: 'loopback' } : { video: chosen });
            }
            const primary = sources.find((s) => s.id.startsWith('screen')) ?? sources[0];
            if (!primary) return callback({});
            callback({ video: primary, audio: primary.id.startsWith('screen') && process.platform === 'win32' ? 'loopback' : undefined });
        } catch {
            callback({});
        }
    }, { useSystemPicker: false });

    applyAdblock();
}

/** Optional YouTube ad blocking for the embedded YouTube player (off by default). */
function applyAdblock() {
    const ses = session.defaultSession;
    ses.webRequest.onBeforeRequest(null);
    if (!settings.get('omniyap.blockYouTubeAds', false)) return;
    const blocked = /(^|\.)(doubleclick\.net|googlesyndication\.com|googleadservices\.com)$/;
    ses.webRequest.onBeforeRequest(
        { urls: ['*://*.googlevideo.com/*', '*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*'] },
        (details, callback) => {
            const host = hostOf(details.url);
            const isAdUris = /\/api\/stats\/ads|\/pagead\/|\/ptracking|\/get_midroll_/.test(details.url);
            callback({ cancel: blocked.test(host) || isAdUris });
        },
    );
}

// ---------------------------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------------------------

function themeDir() {
    const dir = path.join(dataDir(), 'themes');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function safeThemeName(name) {
    const clean = path.basename(String(name)).replace(/[^\w.\- ]/g, '_');
    return clean.endsWith('.css') ? clean : clean + '.css';
}

function readQuickCss() {
    try {
        return fs.readFileSync(path.join(dataDir(), 'quickcss.css'), 'utf8');
    } catch {
        return settings.get('omniyap.quickCss', '');
    }
}

function writeQuickCss(css) {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(path.join(dataDir(), 'quickcss.css'), String(css));
    settings.set('omniyap.quickCss', String(css));
    broadcast('oy:quickcss-changed', String(css));
}

function listThemes() {
    const dir = themeDir();
    return fs.readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        return { fileName: f, name: f.replace(/\.css$/, ''), size: stat.size, modified: stat.mtimeMs };
    });
}

function broadcast(channel, ...args) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

function registerIpc() {
    // Synchronous: the preload needs settings before the page's first script runs.
    ipcMain.on('oy:boot', (event) => {
        if (!fromYapper(event)) {
            event.returnValue = null;
            return;
        }
        event.returnValue = {
            settings: settings.data,
            quickCss: readQuickCss(),
            themes: listThemes(),
            version: VERSION,
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            platform: process.platform,
            mode: 'standalone',
            site: SITE,
            buildHash: buildHash(),
            dev: IS_DEV,
            paths: { data: dataDir(), themes: themeDir() },
        };
    });

    ipcMain.on('oy:get-bundle', (event) => {
        event.returnValue = fromYapper(event) ? getBundle() : '';
    });

    ipcMain.handle('oy:settings:get', (event) => (fromYapper(event) ? settings.data : null));
    ipcMain.handle('oy:settings:set', (event, dotted, value) => {
        if (!fromYapper(event)) return false;
        settings.set(String(dotted), value);
        if (String(dotted).startsWith('omniyap.')) {
            const key = String(dotted).slice('omniyap.'.length);
            if (key === 'tray') refreshTray();
            if (key === 'blockYouTubeAds') applyAdblock();
            if (key === 'spellcheck' && win) win.webContents.session.setSpellCheckerEnabled(!!value);
        }
        return true;
    });
    ipcMain.handle('oy:settings:patch', (event, partial) => {
        if (!fromYapper(event)) return null;
        return settings.patch(partial);
    });

    ipcMain.handle('oy:quickcss:get', (event) => (fromYapper(event) ? readQuickCss() : ''));
    ipcMain.handle('oy:quickcss:set', (event, css) => {
        if (!fromYapper(event)) return false;
        writeQuickCss(css);
        return true;
    });

    ipcMain.handle('oy:themes:list', (event) => (fromYapper(event) ? listThemes() : []));
    ipcMain.handle('oy:themes:read', (event, fileName) => {
        if (!fromYapper(event)) return '';
        try {
            return fs.readFileSync(path.join(themeDir(), safeThemeName(fileName)), 'utf8');
        } catch {
            return '';
        }
    });
    ipcMain.handle('oy:themes:remove', (event, fileName) => {
        if (!fromYapper(event)) return false;
        try {
            fs.unlinkSync(path.join(themeDir(), safeThemeName(fileName)));
            broadcast('oy:themes-changed', listThemes());
            return true;
        } catch {
            return false;
        }
    });
    ipcMain.handle('oy:themes:save', (event, fileName, css) => {
        if (!fromYapper(event)) return false;
        try {
            fs.writeFileSync(path.join(themeDir(), safeThemeName(fileName)), String(css));
            broadcast('oy:themes-changed', listThemes());
            return true;
        } catch {
            return false;
        }
    });
    ipcMain.handle('oy:themes:import', async (event) => {
        if (!fromYapper(event)) return [];
        const result = await dialog.showOpenDialog(win, {
            title: 'Import theme',
            filters: [{ name: 'CSS', extensions: ['css'] }],
            properties: ['openFile', 'multiSelections'],
        });
        if (result.canceled) return [];
        const saved = [];
        for (const file of result.filePaths) {
            try {
                const name = safeThemeName(path.basename(file));
                fs.copyFileSync(file, path.join(themeDir(), name));
                saved.push(name);
            } catch (err) {
                console.error('[omniyap] theme import failed', err.message);
            }
        }
        broadcast('oy:themes-changed', listThemes());
        return saved;
    });
    ipcMain.handle('oy:themes:fetch', async (event, url) => {
        if (!fromYapper(event)) throw new Error('Forbidden');
        if (!/^https:\/\//.test(String(url))) throw new Error('Only https theme URLs are allowed');
        const res = await fetch(String(url), { redirect: 'follow' });
        if (!res.ok) throw new Error(`Theme download failed (${res.status})`);
        const text = await res.text();
        if (text.length > 2_000_000) throw new Error('Theme is too large');
        return text;
    });

    ipcMain.handle('oy:app:info', (event) => (fromYapper(event) ? {
        version: VERSION,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch,
        dataDir: dataDir(),
        themesDir: themeDir(),
        buildHash: buildHash(),
        dev: IS_DEV,
    } : null));

    ipcMain.handle('oy:open-external', (event, url) => {
        if (!fromYapper(event) || !/^https?:\/\//i.test(String(url))) return false;
        void shell.openExternal(String(url));
        return true;
    });
    ipcMain.handle('oy:copy', (event, text) => {
        if (!fromYapper(event)) return false;
        clipboard.writeText(String(text).slice(0, 1_000_000));
        return true;
    });
    ipcMain.handle('oy:files:pick', async (event, opts) => {
        if (!fromYapper(event)) return [];
        const filters = opts?.accept ? [{ name: 'Files', extensions: String(opts.accept).split(',').map((s) => s.trim().replace(/^\./, '')).filter(Boolean) }] : [];
        const result = await dialog.showOpenDialog(win, {
            properties: opts?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
            filters,
        });
        return result.canceled ? [] : result.filePaths;
    });
    ipcMain.handle('oy:ui:zoom', (event, percent) => {
        if (!fromYapper(event)) return 100;
        const value = Math.min(300, Math.max(50, Number(percent) || 100));
        win?.webContents.setZoomFactor(value / 100);
        settings.set('omniyap.zoom', value);
        return value;
    });
    ipcMain.handle('oy:badge', (event, count) => {
        if (!fromYapper(event)) return false;
        const n = Math.max(0, Number(count) || 0);
        if (process.platform === 'darwin') app.dock?.setBadge(n > 0 ? String(n) : '');
        if (win && n > 0 && !win.isFocused()) win.flashFrame(true);
        if (win && n === 0) win.flashFrame(false);
        return true;
    });
    ipcMain.handle('oy:notify', (event, payload) => {
        if (!fromYapper(event) || !Notification.isSupported()) return false;
        if (win?.isFocused()) return false;
        const note = new Notification({
            title: String(payload?.title ?? 'Yapper').slice(0, 90),
            body: String(payload?.body ?? '').slice(0, 200),
            icon: ICON,
            silent: !!payload?.silent,
        });
        note.on('click', () => {
            show();
            if (payload?.url) loadSite(`${SITE}${String(payload.url).startsWith('/') ? '' : '/'}${payload.url}`);
        });
        note.show();
        return true;
    });
    ipcMain.handle('oy:screen:sources', async (event) => {
        if (!fromYapper(event)) return [];
        const own = ownWindowKey();
        const sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 320, height: 180 },
            fetchWindowIcon: true,
        });
        return sources
            .filter((s) => !(own && s.id.startsWith('window:') && windowKey(s.id) === own))
            .map((s) => ({
                id: s.id,
                name: String(s.name || '').slice(0, 120),
                kind: s.id.startsWith('screen:') ? 'screen' : 'window',
                thumb: s.thumbnail && !s.thumbnail.isEmpty() ? `data:image/jpeg;base64,${s.thumbnail.toJPEG(70).toString('base64')}` : null,
                icon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.resize({ width: 32, height: 32 }).toDataURL() : null,
            }));
    });
    ipcMain.handle('oy:screen:pick', (event, id) => {
        if (!fromYapper(event) || typeof id !== 'string' || !SOURCE_ID.test(id)) {
            pendingPick = null;
            return false;
        }
        pendingPick = { id, at: Date.now() };
        return true;
    });

    ipcMain.handle('oy:app:reload', (event) => {
        if (!fromYapper(event)) return false;
        win?.webContents.reload();
        return true;
    });
    ipcMain.handle('oy:app:devtools', (event) => {
        if (!fromYapper(event)) return false;
        win?.webContents.toggleDevTools();
        return true;
    });
    ipcMain.handle('oy:app:quit', (event) => {
        if (!fromYapper(event)) return false;
        quitting = true;
        app.quit();
        return true;
    });
    ipcMain.handle('oy:app:open-path', (event, which) => {
        if (!fromYapper(event)) return false;
        const target = which === 'themes' ? themeDir() : dataDir();
        void shell.openPath(target);
        return true;
    });
    ipcMain.handle('oy:save-diagnostics', async (event, text) => {
        if (!fromYapper(event)) return false;
        const dir = path.join(dataDir(), 'diagnostics');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `omniyap-diagnostics-${Date.now()}.json`);
        fs.writeFileSync(file, String(text));
        void shell.showItemInFolder(file);
        return file;
    });

    // Native context menus, used by the webContextMenus plugin.
    ipcMain.handle('oy:context-menu', (event, template) => {
        if (!fromYapper(event) || !Array.isArray(template)) return null;
        return new Promise((resolve) => {
            let settled = false;
            const items = template.slice(0, 30).map((item) => {
                if (item?.separator) return { type: 'separator' };
                return {
                    label: String(item?.label ?? '').slice(0, 80),
                    enabled: item?.enabled !== false,
                    click: () => {
                        settled = true;
                        resolve(String(item.id));
                    },
                };
            });
            const menu = Menu.buildFromTemplate(items);
            menu.popup({ window: win, callback: () => { if (!settled) resolve(null); } });
        });
    });

    ipcMain.handle('oy:update:status', (event) => (fromYapper(event) ? { state: 'unsupported', reason: 'OmniYap updates are installed from the package manager or GitHub releases.' } : null));
}

// ---------------------------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.setName('OmniYap');
    app.setAsDefaultProtocolClient('omniyap');

    app.on('second-instance', (_event, argv) => {
        show();
        openDeepLink(argv.find((a) => a.startsWith('omniyap://')));
    });
    app.on('open-url', (event, url) => {
        event.preventDefault();
        openDeepLink(url);
    });

    app.whenReady().then(() => {
        // Let the site know it is inside a desktop app that understands its bridge. The official
        // token is included so the site keeps enabling desktop-only features (screen picker,
        // native notifications, activity) instead of falling back to browser behaviour.
        app.userAgentFallback = `${app.userAgentFallback} OmniYap/${VERSION} YapperDesktop/${VERSION}`;
        if (process.platform === 'win32') app.setAppUserModelId('website.omniyap.desktop');

        setupSession();
        registerIpc();
        Menu.setApplicationMenu(null);
        createWindow();
        createTray();

        const zoom = Number(settings.get('omniyap.zoom', 100));
        if (zoom !== 100) win?.webContents.setZoomFactor(zoom / 100);

        openDeepLink(process.argv.find((a) => a.startsWith('omniyap://')));
    });

    app.on('activate', () => {
        if (win) show();
        else createWindow();
    });
    app.on('window-all-closed', () => {
        /* keep running in the tray */
    });
    app.on('before-quit', () => {
        quitting = true;
        saveWindowState();
        settings.flush();
    });
    app.on('will-quit', () => {
        setTimeout(() => app.exit(0), 8000).unref?.();
    });
}

// Exposed for the smoke-test harness: `electron . --omniyap-smoke`.
if (process.argv.includes('--omniyap-smoke')) {
    app.whenReady().then(() => {
        const wc = win?.webContents;
        if (!wc) return;
        setTimeout(() => {
            wc.executeJavaScript(`(() => {
                try {
                    const api = window.OmniYap;
                    return {
                        loaded: !!api,
                        version: api && api.version,
                        plugins: api ? api.plugins.list().map(p => ({ name: p.name, enabled: api.plugins.isEnabled(p.name), running: api.plugins.isRunning(p.name), error: (api.plugins.errors.get(p.name) || {}).message || null })) : [],
                        finder: api ? api.finder.stats() : null,
                        storeReady: !!(api && api.store.isReady),
                        url: location.href,
                    };
                } catch (err) {
                    return { loaded: !!window.OmniYap, fatal: String(err && err.stack || err), url: location.href };
                }
            })()`).then((result) => {
                process.stdout.write('[smoke] ' + JSON.stringify(result) + '\n');
                setTimeout(() => app.exit(0), 100);
            }).catch((err) => {
                process.stdout.write('[smoke] failed ' + String(err) + '\n');
                setTimeout(() => app.exit(1), 100);
            });
        }, Number(process.env.OMNIYAP_SMOKE_DELAY || 12_000));
    });
}
