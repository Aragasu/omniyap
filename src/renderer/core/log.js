// Renderer logging: console output plus a bounded history the diagnostics panel can show.
import OmniYap from "./state.js";

const STYLE = "background:#8b39fd;color:#fff;font-weight:700;padding:1px 5px;border-radius:4px";
const ring = [];
const MAX = 300;

function stringify(value) {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function push(level, args) {
    ring.push({ at: Date.now(), level, text: args.map(stringify).join(" ") });
    if (ring.length > MAX) ring.shift();
}

OmniYap.log = {
    info: (...args) => {
        push("info", args);
        console.log("%cOmniYap", STYLE, ...args);
    },
    warn: (...args) => {
        push("warn", args);
        console.warn("%cOmniYap", STYLE, ...args);
    },
    error: (...args) => {
        push("error", args);
        console.error("%cOmniYap", STYLE, ...args);
    },
    debug: (...args) => {
        if (!OmniYap.dev) return;
        push("debug", args);
        console.debug("%cOmniYap", STYLE, ...args);
    },
    /** Scoped logger for a plugin. */
    scoped(name) {
        const prefix = `[${name}]`;
        return {
            info: (...args) => OmniYap.log.info(prefix, ...args),
            warn: (...args) => OmniYap.log.warn(prefix, ...args),
            error: (...args) => OmniYap.log.error(prefix, ...args),
            debug: (...args) => OmniYap.log.debug(prefix, ...args),
        };
    },
    history: () => ring.slice(),
};

export default OmniYap.log;
