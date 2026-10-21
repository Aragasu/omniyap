// Themes: quick CSS (a scratchpad), local .css files from the themes folder, and https theme links.
import OmniYap from "./state.js";
import log from "./log.js";
import settings from "./settings.js";
import { initialQuickCss, native } from "./native.js";
import dom from "./dom.js";
import events from "./events.js";

const STYLE_ID = "omniyap-themes";
const LINK_STYLE_ID = "omniyap-theme-links";

function ensureStyle(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("style");
        el.id = id;
        el.dataset.omniyap = id;
        (document.head || document.documentElement).appendChild(el);
    }
    return el;
}

function write(id, cssText) {
    const el = ensureStyle(id);
    if (el.textContent !== cssText) el.textContent = cssText;
}

const themes = (OmniYap.themes = {
    available: [],
    linkCache: new Map(),

    async list() {
        try {
            const files = await native.themes.list();
            const boot = OmniYap.initial?.themes || [];
            themes.available = files.length ? files : boot;
        } catch (err) {
            log.warn("could not list themes", err);
            themes.available = OmniYap.initial?.themes || [];
        }
        return themes.available;
    },

    async applyQuickCss(text) {
        write(STYLE_ID, String(text || ""));
    },

    async setQuickCss(text) {
        await themes.applyQuickCss(text);
        try {
            await native.quickCss.set(String(text || ""));
        } catch (err) {
            log.warn("could not save quick CSS", err);
        }
    },

    async loadFile(fileName) {
        try {
            return await native.themes.read(fileName);
        } catch (err) {
            log.warn("could not read theme", fileName, err);
            return "";
        }
    },

    async refresh() {
        if (document.readyState === "loading") await OmniYap.domReady;

        // Quick CSS — read from disk in the app so external edits apply on reload.
        let quick = initialQuickCss;
        try {
            const fromDisk = await native.quickCss.get();
            if (typeof fromDisk === "string") quick = fromDisk;
        } catch {
            /* fall back to the boot snapshot */
        }
        themes.applyQuickCss(quick);

        // Local theme files, in the order the user enabled them.
        const enabled = settings.get("themes.enabled", []) || [];
        const chunks = [];
        for (const fileName of enabled) {
            const text = await themes.loadFile(fileName);
            if (text) chunks.push(`/* ${fileName} */\n${text}`);
        }
        write(STYLE_ID, quick || "");
        write(`${STYLE_ID}-files`, chunks.join("\n"));

        // Remote theme links.
        const links = settings.get("themes.links", []) || [];
        const remote = [];
        for (const link of links) {
            if (!link || !link.enabled || !/^https:\/\//.test(link.url)) continue;
            try {
                let text = themes.linkCache.get(link.url);
                if (!text || Date.now() - (link.at || 0) > 3_600_000) {
                    text = await native.themes.fetch(link.url);
                    themes.linkCache.set(link.url, text);
                }
                remote.push(`/* ${link.url} */\n${text}`);
            } catch (err) {
                log.warn("theme link failed", link.url, err);
            }
        }
        write(LINK_STYLE_ID, remote.join("\n"));
        events.emit("themes:applied");
    },

    async addLink(url, enabled = true) {
        const links = [...(settings.get("themes.links", []) || [])];
        if (links.some((link) => link.url === url)) return false;
        links.push({ url, enabled, at: Date.now() });
        settings.set("themes.links", links);
        await themes.refresh();
        return true;
    },

    removeLink(url) {
        settings.set("themes.links", (settings.get("themes.links", []) || []).filter((link) => link.url !== url));
        themes.linkCache.delete(url);
        return themes.refresh();
    },

    toggleLink(url, enabled) {
        const links = (settings.get("themes.links", []) || []).map((link) => (link.url === url ? { ...link, enabled } : link));
        settings.set("themes.links", links);
        return themes.refresh();
    },

    toggleFile(fileName, enabled) {
        const set = new Set(settings.get("themes.enabled", []) || []);
        if (enabled) set.add(fileName);
        else set.delete(fileName);
        settings.set("themes.enabled", [...set]);
        return themes.refresh();
    },
});

// Keep CSS in sync when the user edits a theme or quick CSS in another window.
native.quickCss?.onChange?.((text) => themes.applyQuickCss(text));
native.themes?.onChange?.(() => themes.refresh());
window.addEventListener("omniyap:themes-changed", () => themes.refresh());
window.addEventListener("omniyap:quickcss-changed", () => themes.refresh());

dom.css.set("theme-base", "");

export default themes;
