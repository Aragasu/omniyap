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

let offMutate = null;

function onMutate(batch) {
    if (!decorators.size) return;
    const rows = new Set();
    for (const record of batch) {
        const target = record.target && (record.target.nodeType === 1 ? record.target : record.target.parentElement);
        const row = target?.closest?.(SELECTOR);
        if (row) rows.add(row);
        for (const node of record.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches(SELECTOR)) rows.add(node);
            else node.querySelectorAll?.(SELECTOR).forEach((el) => rows.add(el));
        }
    }
    rows.forEach((el) => run(el));
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
        document.querySelectorAll(SELECTOR).forEach((el) => {
            if (changed.has(el.getAttribute("data-message-id"))) run(el);
        });
    });
});

export const messages = (OmniYap.messages = {
    selector: SELECTOR,
    decorate(fn) {
        decorators.add(fn);
        sync();
        document.querySelectorAll(SELECTOR).forEach((el) => run(el, fn));
        return () => {
            decorators.delete(fn);
            sync();
        };
    },
    refresh() {
        document.querySelectorAll(SELECTOR).forEach((el) => run(el));
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
