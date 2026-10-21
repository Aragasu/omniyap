// Small, dependency-free helpers shared by the core and plugins.
import OmniYap from "./state.js";

export const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const uid = () => Math.random().toString(36).slice(2, 10);

export function debounce(fn, wait = 120) {
    let timer = null;
    const debounced = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
    debounced.flush = (...args) => {
        clearTimeout(timer);
        fn(...args);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
}

export function throttle(fn, wait = 100) {
    let last = 0;
    let timer = null;
    let pending = null;
    return (...args) => {
        const now = Date.now();
        pending = args;
        if (now - last >= wait) {
            last = now;
            fn(...args);
        } else if (!timer) {
            timer = setTimeout(() => {
                timer = null;
                last = Date.now();
                fn(...pending);
            }, wait - (now - last));
        }
    };
}

export function once(fn) {
    let done = false;
    let value;
    return (...args) => {
        if (done) return value;
        done = true;
        value = fn(...args);
        return value;
    };
}

export function deepMerge(target, patch) {
    if (!isObj(target) || !isObj(patch)) return patch;
    const out = { ...target };
    for (const [key, value] of Object.entries(patch)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
        out[key] = isObj(value) && isObj(target[key]) ? deepMerge(target[key], value) : value;
    }
    return out;
}

export const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

export const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(String(text));
        return true;
    } catch {
        try {
            const area = document.createElement("textarea");
            area.value = String(text);
            area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
            document.body.appendChild(area);
            area.select();
            const ok = document.execCommand("copy");
            area.remove();
            return ok;
        } catch {
            return false;
        }
    }
}

export function formatDateTime(iso) {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return String(iso || "");
    }
}

export function formatDuration(ms) {
    const total = Math.max(0, Math.round(Number(ms) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Resolve with the first truthy value returned by `fn`, polling until `timeout` ms. */
export function pollUntil(fn, { timeout = 15_000, interval = 250 } = {}) {
    return new Promise((resolve) => {
        const started = Date.now();
        const tick = () => {
            let value = null;
            try {
                value = fn();
            } catch {
                value = null;
            }
            if (value) return resolve(value);
            if (Date.now() - started >= timeout) return resolve(null);
            setTimeout(tick, interval);
        };
        tick();
    });
}

OmniYap.util = {
    isObj, sleep, clamp, uid, debounce, throttle, once, deepMerge, clone,
    escapeHtml, escapeRegex, pluralize, copyText, formatDateTime, formatDuration, pollUntil,
};

export default OmniYap.util;
