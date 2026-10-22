import { definePlugin } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

function wrap(before, after) {
    const composer = getComposer();
    if (!composer) return false;
    const start = composer.selectionStart ?? composer.value.length;
    const end = composer.selectionEnd ?? start;
    const selected = composer.value.slice(start, end);
    const next = composer.value.slice(0, start) + before + selected + after + composer.value.slice(end);
    setNativeValue(composer, next);
    composer.focus();
    composer.setSelectionRange?.(start + before.length, start + before.length + selected.length);
    return true;
}

export default definePlugin({
    name: "MarkdownShortcuts",
    description: "Bold, italic, underline, code, strikethrough and spoilers with Ctrl+B, I, U, E, Shift+X and Shift+S in the composer.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const bindings = [
            { key: "b", shift: false, before: "**", after: "**", label: "bold" },
            { key: "i", shift: false, before: "*", after: "*", label: "italic" },
            { key: "u", shift: false, before: "__", after: "__", label: "underline" },
            { key: "e", shift: false, before: "`", after: "`", label: "code" },
            { key: "x", shift: true, before: "~~", after: "~~", label: "strikethrough" },
            { key: "s", shift: true, before: "||", after: "||", label: "spoiler" },
        ];

        const onKey = (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const binding = bindings.find((entry) => entry.key === event.key.toLowerCase() && entry.shift === event.shiftKey);
            if (!binding) return;
            event.preventDefault();
            event.stopPropagation();
            wrap(binding.before, binding.after);
            ctx.toast(`${binding.label[0].toUpperCase()}${binding.label.slice(1)} applied`, { duration: 1200 });
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
