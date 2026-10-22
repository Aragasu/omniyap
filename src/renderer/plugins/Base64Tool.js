import { definePlugin } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function decode(text) {
    const binary = atob(String(text).replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function replaceSelection(transform) {
    const composer = getComposer();
    if (!composer) return;
    const start = composer.selectionStart ?? 0;
    const end = composer.selectionEnd ?? start;
    const whole = start === end;
    const from = whole ? 0 : start;
    const to = whole ? composer.value.length : end;
    const source = composer.value.slice(from, to);
    if (!source) return;
    let result;
    try {
        result = transform(source);
    } catch (err) {
        window.OmniYap?.log?.warn?.("base64 transform failed", err);
        return false;
    }
    const next = composer.value.slice(0, from) + result + composer.value.slice(to);
    setNativeValue(composer, next);
    composer.focus();
    composer.setSelectionRange?.(from, from + result.length);
    return true;
}

export default definePlugin({
    name: "Base64Tool",
    description: "Encode the selected text as Base64 with Alt+B, or decode it with Alt+Shift+B, right inside the composer.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const onKey = (event) => {
            if (!event.altKey || event.key.toLowerCase() !== "b") return;
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            event.preventDefault();
            event.stopPropagation();
            const ok = event.shiftKey ? replaceSelection(decode) : replaceSelection(encode);
            if (ok) ctx.toast(event.shiftKey ? "Decoded" : "Encoded", { duration: 1100 });
            else ctx.toast("Nothing to convert", { type: "error", duration: 1400 });
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
