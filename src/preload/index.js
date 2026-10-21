'use strict';
// OmniYap preload. Runs in an isolated world before any page script.
//
//  1. exposes a narrow native bridge (window.OmniYapNative),
//  2. keeps the official desktop API (window.yapperDesktop) working, so Yapper's own screen picker,
//     notifications and unread badge behave exactly as in the stock app,
//  3. injects the OmniYap renderer bundle into the page's main world, before Yapper boots.
const { contextBridge, ipcRenderer, webFrame } = require('electron');

const SITE_HOSTS = ['yapper.website', 'www.yapper.website'];
const onSite = location.protocol === 'https:' && SITE_HOSTS.includes(location.hostname);
const isTopFrame = window.top === window;

if (onSite && isTopFrame) {
    const boot = (() => {
        try {
            return ipcRenderer.sendSync('oy:boot');
        } catch (err) {
            console.error('[OmniYap] boot payload failed', err);
            return null;
        }
    })();

    const listeners = { themes: new Set(), quickCss: new Set() };
    const safeCall = (fn, arg) => {
        try {
            fn(arg);
        } catch (err) {
            console.error('[OmniYap] listener failed', err);
        }
    };
    const subscribe = (set, cb) => {
        if (typeof cb !== 'function') return () => undefined;
        set.add(cb);
        return () => set.delete(cb);
    };

    ipcRenderer.on('oy:themes-changed', (_event, list) => {
        listeners.themes.forEach((cb) => safeCall(cb, list));
        window.dispatchEvent(new CustomEvent('omniyap:themes-changed'));
    });
    ipcRenderer.on('oy:quickcss-changed', (_event, css) => {
        listeners.quickCss.forEach((cb) => safeCall(cb, css));
        window.dispatchEvent(new CustomEvent('omniyap:quickcss-changed'));
    });
    ipcRenderer.on('oy:open-settings', () => {
        window.dispatchEvent(new CustomEvent('omniyap:open-settings'));
    });

    // ---------------------------------------------------------------------------------------
    // Native bridge
    // ---------------------------------------------------------------------------------------
    const bridge = {
        boot,
        settings: {
            get: () => ipcRenderer.invoke('oy:settings:get'),
            set: (path, value) => ipcRenderer.invoke('oy:settings:set', String(path), value),
            patch: (partial) => ipcRenderer.invoke('oy:settings:patch', partial),
        },
        quickCss: {
            get: () => ipcRenderer.invoke('oy:quickcss:get'),
            set: (css) => ipcRenderer.invoke('oy:quickcss:set', String(css)),
            onChange: (cb) => subscribe(listeners.quickCss, cb),
        },
        themes: {
            list: () => ipcRenderer.invoke('oy:themes:list'),
            read: (file) => ipcRenderer.invoke('oy:themes:read', String(file)),
            remove: (file) => ipcRenderer.invoke('oy:themes:remove', String(file)),
            save: (file, css) => ipcRenderer.invoke('oy:themes:save', String(file), String(css)),
            import: () => ipcRenderer.invoke('oy:themes:import'),
            fetch: (url) => ipcRenderer.invoke('oy:themes:fetch', String(url)),
            onChange: (cb) => subscribe(listeners.themes, cb),
        },
        app: {
            info: () => ipcRenderer.invoke('oy:app:info'),
            reload: () => ipcRenderer.invoke('oy:app:reload'),
            devtools: () => ipcRenderer.invoke('oy:app:devtools'),
            quit: () => ipcRenderer.invoke('oy:app:quit'),
            openPath: (which) => ipcRenderer.invoke('oy:app:open-path', String(which)),
            updateStatus: () => ipcRenderer.invoke('oy:update:status'),
        },
        openExternal: (url) => ipcRenderer.invoke('oy:open-external', String(url)),
        copy: (text) => ipcRenderer.invoke('oy:copy', String(text)),
        setBadge: (count) => ipcRenderer.invoke('oy:badge', Number(count) || 0),
        notify: (payload) => ipcRenderer.invoke('oy:notify', payload || {}),
        files: {
            pick: (opts) => ipcRenderer.invoke('oy:files:pick', { accept: String(opts?.accept || ''), multiple: !!opts?.multiple }),
        },
        ui: {
            setZoom: (percent) => ipcRenderer.invoke('oy:ui:zoom', Number(percent) || 100),
        },
        screen: {
            sources: () => ipcRenderer.invoke('oy:screen:sources'),
            pick: (id) => ipcRenderer.invoke('oy:screen:pick', String(id)),
        },
        contextMenu: (template) => ipcRenderer.invoke('oy:context-menu', template),
        saveDiagnostics: (text) => ipcRenderer.invoke('oy:save-diagnostics', String(text)),
    };

    contextBridge.exposeInMainWorld('OmniYapNative', bridge);

    // ---------------------------------------------------------------------------------------
    // Official desktop bridge shim
    // ---------------------------------------------------------------------------------------
    // The stock preload exposes exactly this API. Re-implementing it means Yapper's website keeps
    // using its own screen picker, native notifications and taskbar badge inside OmniYap.
    contextBridge.exposeInMainWorld('yapperDesktop', {
        version: String(boot?.version || ''),
        platform: process.platform,
        setBadge: (count) => ipcRenderer.invoke('oy:badge', Number(count) || 0),
        notify: (n) => ipcRenderer.invoke('oy:notify', { title: n?.title, body: n?.body, url: n?.url, silent: true }),
        // OmniYap does not scan running processes; it reports no game activity.
        onActivity: (cb) => {
            if (typeof cb === 'function') setTimeout(() => cb(null), 0);
        },
        screenPicker: !(process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland'),
        screenSources: () => ipcRenderer.invoke('oy:screen:sources'),
        pickScreenSource: (id) => ipcRenderer.invoke('oy:screen:pick', String(id ?? '')),
        onUpdateReady: () => () => undefined,
        installUpdate: async () => false,
    });

    // ---------------------------------------------------------------------------------------
    // Mod injection
    // ---------------------------------------------------------------------------------------
    try {
        const bundle = ipcRenderer.sendSync('oy:get-bundle');
        if (bundle) {
            // Runs synchronously in the page's main world, before Yapper's own scripts.
            webFrame.executeJavaScript(bundle).catch((err) => {
                console.error('[OmniYap] injection failed', err);
            });
        } else {
            console.error('[OmniYap] no renderer bundle received — run `npm run build`');
        }
    } catch (err) {
        console.error('[OmniYap] could not load renderer bundle', err);
    }
}
