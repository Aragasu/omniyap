// The plugin system. Shaped like Vencord's definePlugin so ported plugins read naturally:
//
//   export default definePlugin({
//       name: "SilentTyping",
//       description: "…",
//       authors: [{ name: "…" }],
//       tags: ["chat", "privacy"],
//       settings: definePluginSettings({ … }),
//       patches: [{ find: "…", replacement: { match: /…/, replace: "…" } }],
//       start(ctx) { … },
//       stop() { … },
//   });
//
// Everything registered through ctx (CSS, watchers, listeners, timers) is undone on stop.
import OmniYap from "./state.js";
import log from "./log.js";
import events from "./events.js";
import settings from "./settings.js";
import dom from "./dom.js";
import store from "./store.js";
import { finder, patches } from "./turbo.js";

const registry = new Map();
const running = new Map();
const errors = new Map();

function makeContext(plugin, state) {
    const keep = (fn) => {
        if (typeof fn !== "function") return;
        if (state.stopping) {
            try {
                fn();
            } catch (err) {
                log.error(`[${plugin.name}] cleanup failed`, err);
            }
            return;
        }
        state.cleanups.push(fn);
    };

    const scopedLog = log.scoped(plugin.name);

    return {
        plugin,
        log: scopedLog,
        settings: plugin.settings ? plugin.settings.store : {},
        store,
        finder,
        dom,
        events,
        cleanup: (fn) => {
            keep(fn);
            return fn;
        },
        css(text) {
            const id = `plugin-${plugin.name}`;
            dom.css.set(id, text);
            keep(() => dom.css.remove(id));
        },
        watch(selector, fn) {
            keep(dom.watch(selector, fn));
        },
        onMutate(fn) {
            keep(dom.onMutate(fn));
        },
        on(event, fn) {
            keep(events.on(event, fn));
        },
        interval(fn, ms) {
            const id = setInterval(fn, ms);
            keep(() => clearInterval(id));
            return id;
        },
        timeout(fn, ms) {
            const id = setTimeout(fn, ms);
            keep(() => clearTimeout(id));
            return id;
        },
        toast: dom.toast,
        copy: dom.copy,
    };
}

export const plugins = (OmniYap.plugins = {
    registry,
    errors,

    list: () => [...registry.values()],
    get: (name) => registry.get(name),
    isEnabled: (name) => settings.isPluginEnabled(name),
    isRunning: (name) => running.has(name),
    enabledCount: () => [...registry.keys()].filter((name) => plugins.isEnabled(name)).length,

    start(name) {
        const plugin = registry.get(name);
        if (!plugin || running.has(name)) return;
        const state = { cleanups: [], stopping: false };
        running.set(name, state);
        errors.delete(name);
        try {
            if (plugin.patches?.length) patches.register(name, plugin.patches);
            const result = plugin.start?.(makeContext(plugin, state));
            if (typeof result === "function") state.cleanups.push(result);
            else if (result && typeof result.then === "function") {
                result.then(
                    (cleanup) => {
                        if (typeof cleanup !== "function") return;
                        if (running.get(name) === state) state.cleanups.push(cleanup);
                        else cleanup();
                    },
                    (err) => {
                        if (running.get(name) === state) plugins.stop(name);
                        errors.set(name, err);
                        log.error(`[${name}] failed to start`, err);
                        events.emit("plugin:error", name, err);
                    },
                );
            }
            log.info(`started ${name}`);
        } catch (err) {
            errors.set(name, err);
            log.error(`[${name}] failed to start`, err);
            plugins.stop(name);
            errors.set(name, err);
            events.emit("plugin:error", name, err);
        }
        events.emit("plugin:state", name, running.has(name));
    },

    stop(name) {
        const plugin = registry.get(name);
        const state = running.get(name);
        if (!state) return;
        running.delete(name);
        state.stopping = true;
        try {
            plugin?.stop?.();
        } catch (err) {
            log.error(`[${name}] stop() failed`, err);
        }
        for (const cleanup of state.cleanups.reverse()) {
            try {
                cleanup();
            } catch (err) {
                log.error(`[${name}] cleanup failed`, err);
            }
        }
        if (plugin?.patches?.length) patches.unregister(name);
        events.emit("plugin:state", name, false);
    },

    setEnabled(name, enabled) {
        settings.set(`plugins.${name}.enabled`, !!enabled);
        if (enabled) plugins.start(name);
        else plugins.stop(name);
    },

    toggle(name) {
        plugins.setEnabled(name, !plugins.isEnabled(name));
    },

    startEnabled() {
        for (const name of registry.keys()) {
            if (plugins.isEnabled(name)) plugins.start(name);
        }
    },

    stopAll() {
        for (const name of [...running.keys()]) plugins.stop(name);
    },

    /** Diagnostics for the settings UI. */
    diagnostics() {
        return {
            plugins: plugins.list().map((plugin) => ({
                name: plugin.name,
                description: plugin.description,
                enabled: plugins.isEnabled(plugin.name),
                running: plugins.isRunning(plugin.name),
                error: errors.get(plugin.name)?.message || null,
                authors: plugin.authors,
                tags: plugin.tags,
            })),
            patches: patches.report(),
            turbo: finder.stats(),
            settings: { ...settings.data },
            log: log.history(),
        };
    },
});

export function definePlugin(definition) {
    if (!definition || typeof definition.name !== "string" || !definition.name.trim()) {
        throw new Error("definePlugin: a non-empty name is required");
    }
    if (registry.has(definition.name)) throw new Error(`definePlugin: duplicate plugin "${definition.name}"`);

    const plugin = {
        authors: [],
        tags: [],
        description: "",
        ...definition,
    };
    if (plugin.settings && typeof plugin.settings.__bind === "function") plugin.settings.__bind(plugin.name);

    // Every plugin starts off: nothing runs until the user turns it on in the settings panel.
    registry.set(plugin.name, plugin);
    return plugin;
}

OmniYap.definePlugin = definePlugin;
OmniYap.PluginManager = plugins;

export default plugins;
