import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    stripInvisible: { type: OptionType.BOOLEAN, description: "Remove zero-width and directional characters.", default: true },
    trimLines: { type: OptionType.BOOLEAN, description: "Trim trailing spaces and collapse runs of blank lines.", default: true },
    keepNewlines: { type: OptionType.BOOLEAN, description: "Keep line breaks; off joins everything into one line.", default: true },
});

function clean(text) {
    let value = String(text || "").replace(/\r\n?/g, "\n");
    if (settings.store.stripInvisible) value = value.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "");
    if (settings.store.trimLines) {
        value = value.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    }
    if (!settings.store.keepNewlines) value = value.replace(/\s*\n\s*/g, " ");
    return value;
}

export default definePlugin({
    name: "PasteCleaner",
    description: "Pastes only plain text: no hidden formatting, smart quotes, zero-width characters or giant gaps from copied web pages.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const onPaste = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const data = event.clipboardData;
            if (!data) return;
            const html = data.getData("text/html");
            const text = data.getData("text/plain");
            if (!text) return;
            // Plain text is already fine; only take over when formatted HTML is present.
            if (!html && text === clean(text)) return;
            event.preventDefault();
            event.stopPropagation();
            const value = clean(text);
            const start = composer.selectionStart ?? composer.value.length;
            const end = composer.selectionEnd ?? start;
            const next = composer.value.slice(0, start) + value + composer.value.slice(end);
            setNativeValue(composer, next);
            const caret = start + value.length;
            composer.focus();
            composer.setSelectionRange?.(caret, caret);
        };

        document.addEventListener("paste", onPaste, true);
        ctx.cleanup(() => document.removeEventListener("paste", onPaste, true));
    },
});
