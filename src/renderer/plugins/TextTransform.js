import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    shortcuts: { type: OptionType.BOOLEAN, description: "Enable the Alt+Shift keyboard shortcuts.", default: true },
});

const title = (text) => text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
const sentence = (text) => text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());
const swap = (text) => [...text].map((char) => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase())).join("");

const MODES = {
    u: (text) => text.toUpperCase(),
    l: (text) => text.toLowerCase(),
    t: title,
    s: sentence,
    w: swap,
    r: (text) => [...text].reverse().join(""),
};

function apply(mode) {
    const composer = getComposer();
    if (!composer) return false;
    const start = composer.selectionStart ?? 0;
    const end = composer.selectionEnd ?? start;
    const whole = start === end;
    const from = whole ? 0 : start;
    const to = whole ? composer.value.length : end;
    const source = composer.value.slice(from, to);
    if (!source) return false;
    const next = composer.value.slice(0, from) + mode(source) + composer.value.slice(to);
    setNativeValue(composer, next);
    composer.focus();
    composer.setSelectionRange?.(from, from + mode(source).length);
    return true;
}

export default definePlugin({
    name: "TextTransform",
    description: "Change the case of the selection (or the whole message) with Alt+Shift+U/L/T/S, swap case with W or reverse with R.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const onKey = (event) => {
            if (!settings.store.shortcuts || !event.altKey || !event.shiftKey) return;
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const mode = MODES[event.key.toLowerCase()];
            if (!mode) return;
            event.preventDefault();
            event.stopPropagation();
            if (apply(mode)) ctx.toast(`Text ${event.key.toUpperCase()} applied`, { duration: 1000 });
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
