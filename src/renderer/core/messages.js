// Message decoration API (Vencord's message accessories, adapted to Yapper's DOM).
//
//   const off = OmniYap.messages.decorate(({ el, id, message, body, textEl }) => {
//       if (el.querySelector(".my-badge")) return;   // decorators must be idempotent
//       body.appendChild(...);
//   });
//
// Decorators run when a row appears, when its stored message object changes, and on refresh().
import OmniYap from "./state.js";
import log from "./log.js";
import events from "./events.js";
import dom from "./dom.js";
import store from "./store.js";

const SELECTOR = ".msg[data-message-id]";
const decorators = new Set();

export function messageInfo(el) {
    const id = el.getAttribute("data-message-id");
    return {
        el,
        id,
        message: store.isReady ? store.findMessage(id) : null,
        gutter: el.querySelector(":scope > .msg-gutter"),
        body: el.querySelector(":scope > .msg-body"),
        head: el.querySelector(":scope > .msg-body > .msg-head"),
        textEl: el.querySelector(":scope > .msg-body > .msg-text"),
        actions: el.querySelector(":scope > .msg-actions"),
    };
}

function run(el, only) {
    const info = messageInfo(el);
    if (!info.id) return;
    for (const fn of only ? [only] : decorators) {
        try {
            fn(info);
        } catch (err) {
            log.error("message decorator failed", err);
        }
    }
}

// Every decorator runs for every row, so decorating a freshly inserted batch of messages costs
// rows × plugins. Rows are queued and decorated in short slices instead of one long task.
const queuedRows = new Set();
const waitingRows = new WeakSet();
let drainTimer = null;
const DECORATE_SLICE = 8;
const VIEWPORT_MARGIN = 400;

// A channel can keep hundreds of messages mounted, and decorating every one of them with every
// decorator is the most expensive thing the mod does. Rows on or near the screen are decorated
// straight away; the rest wait until they scroll in, so opening a busy channel costs the same as a
// quiet one.
const viewportObserver = typeof IntersectionObserver === "function"
    ? new IntersectionObserver(
        (entries) => {
            let found = false;
            for (const entry of entries) {
                const el = entry.target;
                if (!el.isConnected) {
                    viewportObserver.unobserve(el);
                    continue;
                }
                if (!entry.isIntersecting) continue;
                viewportObserver.unobserve(el);
                waitingRows.delete(el);
                queuedRows.add(el);
                found = true;
            }
            if (found) scheduleDrain();
        },
        { rootMargin: `${VIEWPORT_MARGIN}px 0px` },
    )
    : null;

function nearViewport(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.bottom > -VIEWPORT_MARGIN && rect.top < (window.innerHeight || 0) + VIEWPORT_MARGIN;
}

function deferRow(el) {
    if (!viewportObserver || waitingRows.has(el)) return;
    waitingRows.add(el);
    viewportObserver.observe(el);
}

function scheduleDrain() {
    if (drainTimer !== null) return;
    drainTimer = setTimeout(drain, 16);
}

function drain() {
    drainTimer = null;
    if (!queuedRows.size) return;

    // Decide visibility in one read-only pass before any decorator writes, so the batch costs one
    // layout instead of one per row.
    const ready = [];
    for (const el of queuedRows) {
        queuedRows.delete(el);
        if (!el.isConnected) {
            waitingRows.delete(el);
            continue;
        }
        if (!nearViewport(el)) {
            deferRow(el);
            continue;
        }
        ready.push(el);
    }

    const started = performance.now();
    let index = 0;
    for (; index < ready.length; index++) {
        if (index > 0 && performance.now() - started > DECORATE_SLICE) break;
        run(ready[index]);
    }
    for (; index < ready.length; index++) queuedRows.add(ready[index]);

    if (queuedRows.size) scheduleDrain();
}

function queueRows(rows) {
    for (const el of rows) queuedRows.add(el);
    if (queuedRows.size) scheduleDrain();
}

let offMutate = null;

function onMutate(nodes) {
    if (!decorators.size) return;
    const rows = new Set();
    for (const node of nodes) {
        if (node.nodeType !== 1 || !node.isConnected) continue;
        // A node inside an already rendered row only needs that row re-decorated; searching the
        // whole subtree is reserved for genuinely new containers.
        const row = node.closest(SELECTOR);
        if (row) {
            rows.add(row);
            continue;
        }
        if (node.matches(SELECTOR)) rows.add(node);
        else node.querySelectorAll(SELECTOR).forEach((el) => rows.add(el));
    }
    queueRows(rows);
}

function sync() {
    if (decorators.size && !offMutate) offMutate = dom.onMutate(onMutate);
    else if (!decorators.size && offMutate) {
        offMutate();
        offMutate = null;
    }
}

// Edited messages and reaction changes are store updates, not DOM insertions; re-run decorators
// on the rows whose message object was replaced.
let pendingBase = null;
let scheduled = false;

events.on("store:change", (state, previous) => {
    if (!decorators.size || !state?.messages || state.messages === previous?.messages) return;
    if (scheduled) return;
    scheduled = true;
    pendingBase = previous?.messages || {};
    requestAnimationFrame(() => {
        scheduled = false;
        const base = pendingBase;
        pendingBase = null;
        const current = store.getState();
        if (!base || !current) return;
        const changed = new Set();
        for (const [channelId, list] of Object.entries(current.messages || {})) {
            const old = base[channelId] || [];
            if (!Array.isArray(old) || !Array.isArray(list) || old === list) continue;
            if (list.length >= old.length) {
                let samePrefix = true;
                for (let i = 0; i < old.length; i++) {
                    if (list[i] !== old[i]) {
                        samePrefix = false;
                        break;
                    }
                }
                if (samePrefix) continue;
            }
            const oldById = new Map();
            for (const message of old) if (message?.id != null) oldById.set(message.id, message);
            for (const message of list) {
                const previousMessage = message && oldById.get(message.id);
                if (previousMessage && previousMessage !== message) changed.add(message.id);
            }
        }
        if (!changed.size) return;
        const rows = [];
        document.querySelectorAll(SELECTOR).forEach((el) => {
            if (changed.has(el.getAttribute("data-message-id"))) rows.push(el);
        });
        queueRows(rows);
    });
});

export const messages = (OmniYap.messages = {
    selector: SELECTOR,
    decorate(fn) {
        decorators.add(fn);
        sync();
        // Every row is marked again so the new decorator also reaches rows that are scrolled out;
        // the drain decorates the visible ones now and the rest as they come into view.
        queueRows(document.querySelectorAll(SELECTOR));
        return () => {
            decorators.delete(fn);
            sync();
        };
    },
    /** Re-run every decorator on every visible row, spread over a few frames. */
    refresh() {
        queueRows(document.querySelectorAll(SELECTOR));
    },
    forEachVisible(fn) {
        document.querySelectorAll(SELECTOR).forEach((el) => fn(messageInfo(el)));
    },
    info: messageInfo,
    /** Message text regardless of which field Yapper's payload uses. */
    content(message) {
        if (!message) return "";
        return message.content ?? message.text ?? message.body ?? "";
    },
});

export default messages;
