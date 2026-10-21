// DOM helpers: element builder, managed <style> tags, one shared MutationObserver and toasts.
// Plugins get these through ctx (ctx.css / ctx.watch / ctx.onMutate) so cleanup is automatic.
import OmniYap from "./state.js";
import log from "./log.js";
import { escapeHtml } from "./util.js";

export function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
        for (const [key, value] of Object.entries(props)) {
            if (value == null || value === false) continue;
            if (key === "class" || key === "className") {
                el.className = Array.isArray(value) ? value.filter(Boolean).join(" ") : value;
            } else if (key === "style" && typeof value === "object") {
                Object.assign(el.style, value);
            } else if (key === "style") {
                el.setAttribute("style", value);
            } else if (key === "dataset") {
                for (const [dataKey, dataValue] of Object.entries(value)) el.dataset[dataKey] = dataValue;
            } else if (key.startsWith("on") && typeof value === "function") {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === "html") {
                el.innerHTML = value; // callers pass trusted or escaped strings
            } else if (value === true) {
                el.setAttribute(key, "");
            } else {
                el.setAttribute(key, String(value));
            }
        }
    }
    const add = (child) => {
        if (child == null || child === false) return;
        if (Array.isArray(child)) child.forEach(add);
        else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    };
    children.forEach(add);
    return el;
}

// ---------------------------------------------------------------------------------------------
// Managed styles
// ---------------------------------------------------------------------------------------------

const styles = new Map();
const waiting = new Set();
let waitingObserver = null;

function attach(el) {
    const host = document.head || document.documentElement;
    if (host) {
        host.appendChild(el);
        return;
    }
    waiting.add(el);
    if (waitingObserver) return;
    waitingObserver = new MutationObserver(() => {
        const target = document.head || document.documentElement;
        if (!target) return;
        waitingObserver.disconnect();
        waitingObserver = null;
        for (const node of waiting) target.appendChild(node);
        waiting.clear();
    });
    waitingObserver.observe(document, { childList: true, subtree: true });
}

export const css = {
    set(id, text) {
        let el = styles.get(id);
        if (!el) {
            el = document.createElement("style");
            el.id = `omniyap-style-${id}`;
            el.dataset.omniyap = id;
            styles.set(id, el);
        }
        el.textContent = text;
        if (!el.isConnected) attach(el);
        return el;
    },
    remove(id) {
        const el = styles.get(id);
        if (!el) return;
        waiting.delete(el);
        el.remove();
        styles.delete(id);
    },
    has: (id) => styles.has(id),
};

// ---------------------------------------------------------------------------------------------
// Shared MutationObserver
// ---------------------------------------------------------------------------------------------

const watchers = new Set();
const mutateListeners = new Set();
let observer = null;
let pending = [];
let scheduled = false;
let frameId = null;
let fallbackTimer = null;
let pendingStart = null;

const hasConsumers = () => watchers.size > 0 || mutateListeners.size > 0;

function stopIfIdle() {
    if (hasConsumers()) return;
    observer?.disconnect();
    observer = null;
    if (pendingStart) {
        document.removeEventListener("DOMContentLoaded", pendingStart);
        pendingStart = null;
    }
    if (frameId !== null) cancelAnimationFrame(frameId);
    clearTimeout(fallbackTimer);
    frameId = null;
    fallbackTimer = null;
    scheduled = false;
    pending = [];
}

function matchesDeep(node, selector, cb) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(selector)) cb(node);
    node.querySelectorAll(selector).forEach(cb);
}

function flush() {
    if (!scheduled) return;
    scheduled = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    clearTimeout(fallbackTimer);
    frameId = null;
    fallbackTimer = null;
    const batch = pending;
    pending = [];
    if (!hasConsumers()) return stopIfIdle();

    for (const watcher of watchers) {
        for (const record of batch) {
            for (const node of record.addedNodes) {
                matchesDeep(node, watcher.selector, (el) => {
                    if (watcher.seen.has(el)) return;
                    watcher.seen.add(el);
                    try {
                        watcher.fn(el);
                    } catch (err) {
                        log.error(`watch callback failed for ${watcher.selector}`, err);
                    }
                });
            }
        }
    }
    for (const fn of [...mutateListeners]) {
        try {
            fn(batch);
        } catch (err) {
            log.error("onMutate callback failed", err);
        }
    }
}

function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver((records) => {
        if (!hasConsumers()) return stopIfIdle();
        for (let i = 0; i < records.length; i++) pending.push(records[i]);
        if (scheduled) return;
        scheduled = true;
        if (typeof requestAnimationFrame === "function") frameId = requestAnimationFrame(flush);
        fallbackTimer = setTimeout(flush, document.hidden ? 250 : 1000);
    });
    const start = () => {
        pendingStart = null;
        if (!observer || !hasConsumers() || !document.documentElement) return;
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.documentElement) start();
    else {
        pendingStart = start;
        document.addEventListener("DOMContentLoaded", start, { once: true });
    }
}

/** Call fn(el) once for every element matching selector that appears (including already present). */
export function watch(selector, fn) {
    const watcher = { selector, fn, seen: new WeakSet() };
    watchers.add(watcher);
    ensureObserver();
    const scan = () => {
        document.querySelectorAll(selector).forEach((el) => {
            if (watcher.seen.has(el)) return;
            watcher.seen.add(el);
            try {
                fn(el);
            } catch (err) {
                log.error(`watch callback failed for ${selector}`, err);
            }
        });
    };
    if (document.body) scan();
    else OmniYap.domReady.then(scan);
    return () => {
        watchers.delete(watcher);
        stopIfIdle();
    };
}

/** Run fn(batch) at most once per frame while the DOM changes. */
export function onMutate(fn) {
    mutateListeners.add(fn);
    ensureObserver();
    return () => {
        mutateListeners.delete(fn);
        stopIfIdle();
    };
}

/** Resolve with the first element matching selector (or null after timeout ms). */
export function waitFor(selector, timeout = 10_000) {
    return new Promise((resolve) => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);
        let timer = null;
        const off = onMutate(() => {
            const el = document.querySelector(selector);
            if (!el) return;
            off();
            clearTimeout(timer);
            resolve(el);
        });
        if (timeout) {
            timer = setTimeout(() => {
                off();
                resolve(null);
            }, timeout);
        }
    });
}

// ---------------------------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------------------------

let toastHost = null;

export function toast(message, { type = "info", duration = 3500 } = {}) {
    if (!toastHost || !toastHost.isConnected) {
        toastHost = h("div", { class: "omniyap-toasts", role: "status", "aria-live": "polite" });
        (document.body || document.documentElement).appendChild(toastHost);
    }
    const el = h("div", { class: `omniyap-toast omniyap-toast-${type}` }, String(message));
    toastHost.appendChild(el);
    setTimeout(() => {
        el.classList.add("out");
        setTimeout(() => el.remove(), 250);
    }, duration);
    return el;
}

export const dom = (OmniYap.dom = {
    h,
    css,
    watch,
    onMutate,
    waitFor,
    toast,
    escapeHtml,
    /** Return the closest ancestor matching selector, or null. */
    closest: (el, selector) => (el?.closest ? el.closest(selector) : null),
    /** Dispatch a click on the first element matching selector. */
    click: (selector) => {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement) el.click();
        return !!el;
    },
    /** Copy text with a toast on failure. */
    async copy(text, label = "Copied") {
        const { copyText } = await import("./util.js");
        const ok = await copyText(text);
        toast(ok ? label : "Could not copy to the clipboard", { type: ok ? "success" : "error" });
        return ok;
    },
});

css.set(
    "core",
    `
.omniyap-toasts{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.omniyap-toast{pointer-events:auto;max-width:360px;padding:10px 14px;border-radius:10px;background:#242432;color:#ececf1;
  font:500 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);animation:omniyap-in .2s ease}
.omniyap-toast-error{border-color:#e5484d}.omniyap-toast-success{border-color:#30a46c}
.omniyap-toast.out{opacity:0;transform:translateY(6px);transition:all .25s}
@keyframes omniyap-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`,
);

export default dom;
