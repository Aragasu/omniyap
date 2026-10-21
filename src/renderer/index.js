// OmniYap renderer entry point. Injected by the preload at document start, before Yapper's scripts.
// Order matters: the Turbopack hook must be installed immediately, then plugins, then the UI.
import OmniYap from "./core/state.js";
import log from "./core/log.js";
import events from "./core/events.js";
import settings from "./core/settings.js";
import dom from "./core/dom.js";
import store from "./core/store.js";
import { finder } from "./core/turbo.js";
import plugins from "./core/plugins.js";
import themes from "./core/themes.js";
import ui from "./ui/settings.js";

import "./plugins/index.js";

// A second injection (reload of the bundle in DevTools) must not double-register plugins.
if (window.__OMNIYAP_LOADED__) {
    log.warn("OmniYap is already loaded in this page");
} else {
    window.__OMNIYAP_LOADED__ = true;
    boot();
}

function boot() {
    const started = performance.now();

    window.addEventListener("error", (event) => {
        OmniYap.errors.push({ at: Date.now(), message: event.message, source: event.filename, line: event.lineno });
    });
    window.addEventListener("unhandledrejection", (event) => {
        OmniYap.errors.push({ at: Date.now(), message: String(event.reason?.message || event.reason) });
    });

    // Start plugins right away: socket hooks and request interception need to be in place before
    // Yapper opens its connection. DOM-dependent plugins use watchers, which handle a missing body.
    try {
        plugins.startEnabled();
    } catch (err) {
        log.error("could not start plugins", err);
    }

    OmniYap.domReady.then(async () => {
        try {
            await themes.refresh();
        } catch (err) {
            log.error("could not apply themes", err);
        }
        try {
            ui.injectLauncher();
        } catch (err) {
            log.error("could not inject the settings launcher", err);
        }
        events.emit("boot:ready");
        log.info(`OmniYap ${OmniYap.version} ready in ${Math.round(performance.now() - started)} ms (${plugins.enabledCount()}/${plugins.list().length} plugins enabled)`);
    });

    // Early shortcut: the preload also forwards Ctrl+, from the main process menu/tray.
    window.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key === ",") {
            event.preventDefault();
            ui.toggle();
        }
    }, true);
    window.addEventListener("omniyap:open-settings", () => ui.open());

    // A stable handle for DevTools and for plugin authors.
    window.omniyap = {
        plugins,
        settings,
        store,
        finder,
        themes,
        ui,
        openSettings: () => ui.open(),
        version: OmniYap.version,
    };
}

export default OmniYap;
