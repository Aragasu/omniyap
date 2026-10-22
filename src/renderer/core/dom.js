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
let queued = [];
let queueSet = new Set();
let deferred = [];
let scheduled = false;
let timer = null;
let pendingStart = null;
let lastPass = 0;

// One observer serves every plugin, so the cost of a pass grows with the number of installed
// plugins. Decoration does not need 60 Hz: passes are spaced out and capped in time so a page
// that mutates constantly (a busy chat log) cannot starve the UI thread.
const PASS_INTERVAL = 150;
const PASS_BUDGET = 10;

const hasConsumers = () => watchers.size > 0 || mutateListeners.size > 0;

function stopIfIdle() {
    if (hasConsumers()) return;
    observer?.disconnect();
    observer = null;
    if (pendingStart) {
        document.removeEventListener("DOMContentLoaded", pendingStart);
        pendingStart = null;
    }
    clearTimeout(timer);
    timer = null;
    scheduled = false;
    queued = [];
    queueSet = new Set();
    deferred = [];
}

// Plugins mount their own nodes into the page. Those insertions must not feed back into the watcher
// passes or the message decorators, or every decoration would re-trigger the pass that caused it and
// the client would spend the whole frame budget decorating itself. Nodes inside a message row are
// checked up to the row: the row itself may carry a plugin class (e.g. a collapsed message) while
// still being a real container that Yapper inserts into.
function isPluginNode(node) {
    for (let el = node; el && el.nodeType === 1; el = el.parentElement) {
        if (el.classList?.contains("msg")) return false;
        const className = el.className;
        if (typeof className === "string" && className.includes("omniyap")) return true;
    }
    return false;
}

function matchesDeep(node, selector, cb) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(selector)) cb(node);
    node.querySelectorAll(selector).forEach(cb);
}

function schedule() {
    if (scheduled) return;
    scheduled = true;
    const delay = Math.max(16, PASS_INTERVAL - (performance.now() - lastPass));
    timer = setTimeout(flush, delay);
}

// Plugins react to insertions by scanning the document, so running every listener on every pass
// costs more CPU the more plugins are installed. Each listener gets a backlog of inserted nodes
// and passes serve a rotating slice of them, so every plugin still sees every insertion while a
// single pass stays short.
const backlogs = new WeakMap();
let nextListener = 0;
const MAX_BACKLOG = 4000;
const LISTENER_CHUNK = 200;

function queueForListeners(nodes) {
    for (const fn of mutateListeners) {
        let list = backlogs.get(fn);
        if (!list) {
            list = [];
            backlogs.set(fn, list);
        }
        for (const node of nodes) list.push(node);
        if (list.length > MAX_BACKLOG) list.splice(0, list.length - MAX_BACKLOG);
    }
}

function runListeners(nodes) {
    if (!mutateListeners.size) return;
    if (nodes.length) queueForListeners(nodes);
    const listeners = [...mutateListeners];
    const count = listeners.length;
    const deadline = performance.now() + PASS_BUDGET;
    let served = 0;
    for (let i = 0; i < count; i++) {
        if (served && performance.now() >= deadline) break;
        const fn = listeners[(nextListener + i) % count];
        const list = backlogs.get(fn);
        if (!list || !list.length) continue;
        const batch = list.splice(0, Math.min(list.length, LISTENER_CHUNK));
        try {
            fn(batch);
        } catch (err) {
            log.error("onMutate callback failed", err);
        }
        served++;
    }
    nextListener = count ? (nextListener + served) % count : 0;
}

function flush() {
    if (!scheduled) return;
    scheduled = false;
    timer = null;
    lastPass = performance.now();
    const nodes = deferred.length ? deferred.concat(queued) : queued;
    deferred = [];
    queued = [];
    queueSet = new Set();
    if (!hasConsumers()) return stopIfIdle();
    if (!nodes.length) return;

    // A React re-render inserts whole subtrees, so most queued nodes are descendants of another
    // node in the same batch. Scanning the roots only turns thousands of subtree walks into a few.
    const nodeSet = new Set(nodes);
    const scan = nodes.filter((node) => {
        let parent = node.parentElement;
        while (parent) {
            if (nodeSet.has(parent)) return false;
            parent = parent.parentElement;
        }
        return true;
    });

    const deadline = lastPass + PASS_BUDGET;
    let index = 0;
    for (; index < scan.length; index++) {
        if (performance.now() >= deadline) break;
        const node = scan[index];
        for (const watcher of watchers) {
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
    if (index < scan.length) {
        deferred = scan.slice(index);
        schedule();
    }
    runListeners(scan);
}

function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver((records) => {
        if (!hasConsumers()) return stopIfIdle();
        // Only element insertions matter to plugins; ignoring text and attribute changes keeps a
        // plugin's own styling writes from re-triggering the pass that made them.
        let added = 0;
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node.nodeType !== 1 || queueSet.has(node) || isPluginNode(node)) continue;
                queueSet.add(node);
                queued.push(node);
                added++;
            }
        }
        if (added) schedule();
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

/** Run fn(addedNodes) after elements are inserted, at most a few times a second. */
export function onMutate(fn) {
    mutateListeners.add(fn);
    backlogs.set(fn, []);
    ensureObserver();
    return () => {
        mutateListeners.delete(fn);
        backlogs.delete(fn);
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
/* Above the settings panel and its dialogs, so feedback for an action taken in them is visible. */
.omniyap-toasts{position:fixed;right:16px;bottom:16px;z-index:2147483300;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}
.omniyap-toast{pointer-events:auto;display:flex;align-items:center;gap:9px;max-width:360px;padding:10px 14px;border-radius:10px;background:#242432;color:#ececf1;
  font:500 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);animation:omniyap-in .2s ease}
/* A status dot carries the type for colour-blind readers, not just the 1px border tint. */
.omniyap-toast::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:#8b8d98}
.omniyap-toast-error{border-color:#e5484d}.omniyap-toast-error::before{background:#e5484d}
.omniyap-toast-success{border-color:#30a46c}.omniyap-toast-success::before{background:#30a46c}
.omniyap-toast.out{opacity:0;transform:translateY(6px);transition:all .25s}
@keyframes omniyap-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`,
);

export default dom;
