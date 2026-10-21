// Helpers shared by plugins. Everything here works against the live DOM and store; nothing assumes
// a private Yapper API that could change without notice.
import OmniYap from "../core/state.js";
import dom from "../core/dom.js";
import store from "../core/store.js";
import messages from "../core/messages.js";
import { native } from "../core/native.js";

const { h } = dom;

/** The composer textarea, or null. */
export const getComposer = () => document.querySelector(".composer textarea, .composer-box textarea, textarea[enterkeyhint]");

/** Set a value on a React-controlled input through the native setter, then notify React. */
export function setNativeValue(element, value) {
    const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Insert text at the caret (or replace the selection). Does not send. */
export function insertIntoComposer(text) {
    const composer = getComposer();
    if (!composer) return false;
    composer.focus();
    const start = composer.selectionStart ?? composer.value.length;
    const end = composer.selectionEnd ?? composer.value.length;
    const next = composer.value.slice(0, start) + text + composer.value.slice(end);
    setNativeValue(composer, next);
    const caret = start + text.length;
    composer.setSelectionRange?.(caret, caret);
    return true;
}

/** Put text in the composer and press send. */
export async function sendMessage(text, { submit = true } = {}) {
    const composer = getComposer();
    if (!composer) return false;
    setNativeValue(composer, text);
    composer.focus();
    if (!submit) return true;
    await new Promise((resolve) => setTimeout(resolve, 30));
    const send = document.querySelector(".composer .send-btn, .composer-box .send-btn");
    if (send instanceof HTMLElement) {
        send.click();
        return true;
    }
    composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    return true;
}

export const currentChannelId = () => store.activeChannelId();

export function channelLabel() {
    const id = store.activeChannelId();
    return id ? store.channelName(id) : "";
}

/** Add a button to a message row's hover actions. Returns the button. */
export function addMessageAction(row, { label, title, html, onClick }) {
    const actions = row.querySelector(":scope > .msg-actions");
    if (!actions || actions.querySelector(`[data-omniyap-action="${label}"]`)) return null;
    const button = h("button", {
        class: "icon-btn",
        title: title || label,
        "aria-label": title || label,
        "data-omniyap-action": label,
        onclick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick?.(event, row);
        },
    });
    if (html) button.innerHTML = html;
    else button.textContent = label;
    actions.appendChild(button);
    return button;
}

export function messageUrl(id, channelId = store.activeChannelId()) {
    const base = location.origin;
    return `${base}/?channel=${encodeURIComponent(channelId || "")}&message=${encodeURIComponent(id || "")}`;
}

export function authorOf(row) {
    const authorId = row?.querySelector(".avatar[aria-label]")?.getAttribute("aria-label")?.replace(/'s profile$/, "") || null;
    const name = row?.querySelector(".msg-author")?.textContent?.trim() || "";
    return { id: authorId, name };
}

export function messageAuthorId(message) {
    if (!message) return null;
    return message.author_id || message.user_id || message.authorId || message.userId || message.sender_id || null;
}

export function attachmentUrls(row) {
    const urls = [];
    row?.querySelectorAll(".msg-image img, .msg-body img, .msg-body video, .msg-body audio, .msg-body a[href]").forEach((el) => {
        const src = el.currentSrc || el.src || el.href;
        if (src && /^https?:/.test(src)) urls.push(src);
    });
    return urls;
}

export function downloadUrl(url, filename) {
    const link = h("a", { href: url, download: filename || "", target: "_blank", rel: "noreferrer" });
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

export function formatTime(date = Date.now()) {
    return new Date(date).toLocaleString();
}

export function formatDuration(ms) {
    const total = Math.max(0, Math.round(Number(ms) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Persist small plugin data as JSON in localStorage (survives reloads, no server involved). */
export function localJson(key, fallback) {
    return {
        read() {
            try {
                const raw = localStorage.getItem(`omniyap:${key}`);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },
        write(value) {
            try {
                localStorage.setItem(`omniyap:${key}`, JSON.stringify(value));
            } catch (err) {
                OmniYap.log.warn("could not persist", key, err);
            }
        },
    };
}

/** Open a channel and scroll to a message, flashing it briefly. */
export async function jumpToMessage(channelId, messageId) {
    if (channelId) {
        try {
            store.setState({ activeChannelId: channelId });
        } catch (err) {
            OmniYap.log.warn("could not switch channel", err);
        }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    const row = document.querySelector(`.msg[data-message-id="${CSS.escape(String(messageId))}"]`);
    if (!row) return false;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("omniyap-flash");
    setTimeout(() => row.classList.remove("omniyap-flash"), 1600);
    return true;
}

/** The current server object, if a server channel is open. */
export function currentServer() {
    const channel = store.activeChannel();
    if (!channel?.server_id) return null;
    return store.server(channel.server_id);
}

/** A profile URL for a user id (Yapper profiles live on the same page). */
export const profileUrl = (userId) => `${location.origin}/?user=${encodeURIComponent(userId)}`;

/** Default quick reactions, matching Yapper's common emoji set. */
export const QUICK_REACTIONS = ["😂", "🔥", "❤️", "👍", "👀", "🎉", "😭", "💀"];

/** Copy an image to the clipboard as a PNG (used by copyEmojiMarkdown/petpet exports). */
export async function copyImage(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        return true;
    } catch {
        return false;
    }
}

export { h, dom, store, messages, native };

