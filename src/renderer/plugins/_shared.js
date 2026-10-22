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

/** A message's creation date, whichever field Yapper used. */
export function messageDate(message) {
    const raw = message?.created_at ?? message?.timestamp ?? message?.createdAt ?? message?.at ?? message?.time;
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * Open a message's "More" menu and click its Edit item. Resolves true when the editor opened.
 * Used by QuickEdit and DoubleClickEdit; both go through Yapper's own UI instead of guessing its API.
 */
export async function editMessage(row) {
    if (!row) return false;
    const more = row.querySelector('.msg-actions button[aria-label="More"], .msg-actions button[title="More"]');
    if (!(more instanceof HTMLElement)) return false;
    more.click();
    await new Promise((resolve) => setTimeout(resolve, 90));
    const candidates = [...document.querySelectorAll('button, [role="menuitem"], [role="button"], .menu-item, .ctx-item')];
    const edit = candidates.find((el) => {
        const text = el.textContent?.trim().toLowerCase();
        return text === "edit" || text === "edit message" || text === "edit message…";
    });
    if (edit instanceof HTMLElement) {
        edit.click();
        return true;
    }
    document.body.click();
    return false;
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

/** Split a comma/newline separated setting into trimmed, non-empty values. */
export function parseList(value, limit = 200) {
    return String(value || "")
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, limit);
}

/** A stable hue (0-359) for a user id or name. */
export function stableHue(text) {
    let value = 0;
    const source = String(text || "");
    for (let i = 0; i < source.length; i++) value = (value * 31 + source.charCodeAt(i)) >>> 0;
    return value % 360;
}

/** Add a button to the chat header, once. Returns the button or null. */
export function headerButton({ className, title, text, onClick, prepend = false }) {
    const head = document.querySelector("header.main-head, .chat .main-head");
    if (!head) return null;
    const existing = head.querySelector(`.${className}`);
    if (existing) return existing;
    const button = h("button", {
        class: `icon-btn ${className}`,
        title,
        "aria-label": title,
        onclick: onClick,
    }, text);
    if (prepend) head.prepend(button);
    else head.appendChild(button);
    return button;
}

/** Download a text blob without leaving the app. */
export function downloadText(filename, text, mime = "text/plain") {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    downloadUrl(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

let sharedAudio = null;

/** A shared AudioContext; created lazily and resumed on the next user gesture. */
export function audioContext() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedAudio) sharedAudio = new Ctor();
    if (sharedAudio.state === "suspended") sharedAudio.resume().catch(() => undefined);
    return sharedAudio;
}

/** Play a short synthesised tone (no audio files, no network). */
export function playTone(frequency = 660, duration = 0.12, { volume = 0.12, type = "sine", delay = 0 } = {}) {
    const ac = audioContext();
    if (!ac) return false;
    try {
        const at = ac.currentTime + Math.max(0, delay);
        const oscillator = ac.createOscillator();
        const gain = ac.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain).connect(ac.destination);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.02);
        return true;
    } catch {
        return false;
    }
}

/** Play a sequence of [frequency, startOffset] notes. */
export function playMelody(notes, { volume = 0.1, type = "sine", duration = 0.16 } = {}) {
    return notes.every(([frequency, delay]) => playTone(frequency, duration, { volume, type, delay }));
}

/** The most recent message in a channel, if Yapper has loaded it. */
export function lastMessage(channelId) {
    const list = store.messages(channelId);
    return list.length ? list[list.length - 1] : null;
}

/**
 * Run transform(text) right before a message is sent (Enter or the send button). The transform can
 * return the same text to leave the send alone. Returns a cleanup function.
 */
export function interceptSend(transform) {
    let busy = false;

    const rewrite = () => {
        if (busy) return false;
        const composer = getComposer();
        if (!composer || !composer.value.trim()) return false;
        let next;
        try {
            next = transform(composer.value, composer);
        } catch (err) {
            OmniYap.log.warn("send transform failed", err);
            return false;
        }
        if (typeof next !== "string" || next === composer.value) return false;
        busy = true;
        setNativeValue(composer, next);
        composer.focus();
        setTimeout(() => {
            const send = document.querySelector(".composer .send-btn, .composer-box .send-btn");
            if (send instanceof HTMLElement) send.click();
            else composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
            setTimeout(() => { busy = false; }, 60);
        }, 30);
        return true;
    };

    const onKeyDown = (event) => {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
        if (event.target !== getComposer()) return;
        if (!rewrite()) return;
        event.preventDefault();
        event.stopPropagation();
    };

    const onClick = (event) => {
        if (busy || !(event.target instanceof Element)) return;
        if (!event.target.closest(".send-btn, button[type='submit'], [aria-label='Send']")) return;
        if (!rewrite()) return;
        event.preventDefault();
        event.stopPropagation();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("click", onClick, true);
    };
}

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

