// Bridge to the Electron preload. Outside the app (a plain browser tab, or the smoke harness) a
// localStorage-backed fallback keeps the mod usable, so the settings UI and plugins can be tested
// without packaging.
import OmniYap from "./state.js";
import { deepMerge } from "./util.js";

const LS_KEY = "omniyap:fallback-settings";
const LS_CSS = "omniyap:fallback-quickcss";

function readLocal() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
        return {};
    }
}

function writeLocal(value) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(value));
    } catch (err) {
        console.warn("[OmniYap] could not persist fallback settings", err);
    }
}

function setPath(obj, dotted, value) {
    const keys = String(dotted).split(".").filter(Boolean);
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
}

const fallbackListeners = new Set();

const fallback = {
    fallback: true,
    boot: null,
    settings: {
        get: async () => readLocal(),
        set: async (path, value) => {
            const data = readLocal();
            setPath(data, path, value);
            writeLocal(data);
            return true;
        },
        patch: async (partial) => {
            const merged = deepMerge(readLocal(), partial);
            writeLocal(merged);
            return merged;
        },
    },
    quickCss: {
        get: async () => localStorage.getItem(LS_CSS) || "",
        set: async (css) => {
            localStorage.setItem(LS_CSS, String(css));
            fallbackListeners.forEach((fn) => fn(String(css)));
            return true;
        },
        onChange: (cb) => {
            fallbackListeners.add(cb);
            return () => fallbackListeners.delete(cb);
        },
    },
    themes: {
        list: async () => [],
        read: async () => "",
        remove: async () => false,
        save: async () => false,
        import: async () => [],
        fetch: async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Theme download failed (${res.status})`);
            return res.text();
        },
        onChange: () => () => undefined,
    },
    app: {
        info: async () => ({
            version: OmniYap.version,
            platform: "browser",
            dataDir: "(browser)",
            themesDir: "(browser)",
            buildHash: "dev",
        }),
        reload: async () => location.reload(),
        devtools: async () => false,
        quit: async () => undefined,
        openPath: async () => false,
        updateStatus: async () => ({ state: "unsupported" }),
    },
    openExternal: async (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
        return true;
    },
    copy: async (text) => {
        try {
            await navigator.clipboard.writeText(String(text));
            return true;
        } catch {
            return false;
        }
    },
    setBadge: async () => false,
    notify: async () => false,
    files: { pick: async () => [] },
    ui: { setZoom: async () => 100 },
    screen: { sources: async () => [], pick: async () => false },
    contextMenu: async () => null,
    saveDiagnostics: async () => false,
};

export const native = window.OmniYapNative || fallback;

export const boot = native.boot || null;

/** Persisted settings data available synchronously at boot. */
export const initialSettings = (boot && boot.settings) || readLocal();

/** Quick CSS text available at boot (so a theme applies without a flash). */
export const initialQuickCss = (boot && boot.quickCss) || localStorage.getItem(LS_CSS) || "";

OmniYap.native = native;
OmniYap.inApp = !fallback.fallback;
OmniYap.initial = boot || { mode: "browser", version: OmniYap.version };
OmniYap.boot = {
    version: (boot && boot.version) || OmniYap.version,
    electron: (boot && boot.electron) || null,
    chrome: (boot && boot.chrome) || (navigator.userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || null,
    platform: (boot && boot.platform) || "browser",
    mode: (boot && boot.mode) || "browser",
    site: (boot && boot.site) || location.origin,
    buildHash: (boot && boot.buildHash) || "dev",
    dev: !!(boot && boot.dev),
    paths: (boot && boot.paths) || { data: "(browser)", themes: "(browser)" },
    themes: (boot && boot.themes) || [],
};

export default native;
