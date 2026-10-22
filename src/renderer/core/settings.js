// Settings: the persisted JSON tree, a typed option API for plugins, and change events.
//
//   const settings = definePluginSettings({
//       enabled: { type: OptionType.BOOLEAN, description: "…", default: true },
//   });
//   definePlugin({ name: "MyPlugin", settings, ... });
//   settings.store.enabled          // read (falls back to the default)
//   settings.store.enabled = false  // writes and persists
import OmniYap from "./state.js";
import { initialSettings, native } from "./native.js";
import { clone, deepMerge, escapeRegex, isObj } from "./util.js";

export const OptionType = {
    BOOLEAN: "boolean",
    STRING: "string",
    NUMBER: "number",
    SELECT: "select",
    SLIDER: "slider",
    COMPONENT: "component",
    CUSTOM: "custom",
};

const data = deepMerge({ plugins: {}, omniyap: {}, themes: { enabled: [] } }, clone(initialSettings) || {});
data.plugins = data.plugins || {};
data.omniyap = data.omniyap || {};
data.themes = data.themes || { enabled: [] };

const bus = new OmniYap.Emitter();

function getPath(dotted) {
    let cur = data;
    for (const key of String(dotted).split(".")) {
        if (cur == null) return undefined;
        cur = cur[key];
    }
    return cur;
}

function setPath(dotted, value) {
    const keys = String(dotted).split(".").filter(Boolean);
    let cur = data;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!isObj(cur[keys[i]])) cur[keys[i]] = {};
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
}

const settings = {
    data,

    get(path, fallback) {
        const value = getPath(path);
        return value === undefined ? fallback : value;
    },

    set(path, value) {
        if (/(^|\.)(__proto__|constructor|prototype)(\.|$)/.test(String(path))) return;
        setPath(path, value);
        try {
            const result = native.settings.set(path, value);
            if (result && typeof result.catch === "function") {
                result.catch((err) => OmniYap.log.warn("could not persist", path, err));
            }
        } catch (err) {
            OmniYap.log.warn("could not persist", path, err);
        }
        settings.announce(path, value);
    },

    announce(path, value) {
        bus.emit("change", path, value);
        bus.emit(`change:${path}`, value);
    },

    onChange(fn) {
        return bus.on("change", fn);
    },

    onPath(path, fn) {
        return bus.on(`change:${path}`, fn);
    },

    isPluginEnabled(name) {
        const plugin = data.plugins[name];
        return !!(plugin && plugin.enabled);
    },

};

/**
 * Declare a plugin's options. The returned object is bound to a plugin by definePlugin, so a
 * module can keep its `settings` constant at the top and pass it in below — same shape as Vencord.
 */
export function definePluginSettings(definitions = {}) {
    let pluginName = null;
    const defaults = {};
    for (const [key, def] of Object.entries(definitions)) defaults[key] = def?.default;

    const read = () => (pluginName ? data.plugins[pluginName] || {} : {});

    const store = new Proxy({}, {
        get(_target, key) {
            if (typeof key !== "string") return undefined;
            const raw = read();
            return raw[key] === undefined ? defaults[key] : raw[key];
        },
        set(_target, key, value) {
            if (typeof key !== "string" || !pluginName) return false;
            settings.set(`plugins.${pluginName}.${key}`, value);
            return true;
        },
        has(_target, key) {
            return typeof key === "string" && (key in defaults || key in read());
        },
        ownKeys: () => Object.keys(defaults),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });

    return {
        def: definitions,
        definitions,
        get name() {
            return pluginName;
        },
        store,
        get: (key) => store[key],
        set: (key, value) => {
            store[key] = value;
        },
        reset(key) {
            if (pluginName) settings.set(`plugins.${pluginName}.${key}`, defaults[key]);
        },
        resetAll() {
            if (!pluginName) return;
            const raw = read();
            settings.set(`plugins.${pluginName}`, { enabled: !!raw.enabled });
            for (const [key, value] of Object.entries(defaults)) settings.announce(`plugins.${pluginName}.${key}`, value);
        },
        onChange(fn) {
            return settings.onChange((path, value) => {
                if (!pluginName) return;
                const match = String(path).match(new RegExp(`^plugins\\.${escapeRegex(pluginName)}\\.(.+)$`));
                if (match && match[1] !== "enabled") fn(match[1], value);
            });
        },
        __bind(name) {
            pluginName = name;
        },
    };
}

OmniYap.settings = settings;
OmniYap.definePluginSettings = definePluginSettings;
OmniYap.OptionType = OptionType;

export default settings;
