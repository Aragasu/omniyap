import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "Case conversion applied just before sending.",
        options: [
            { label: "UPPERCASE", value: "upper" },
            { label: "lowercase", value: "lower" },
            { label: "Title Case", value: "title" },
            { label: "Sentence case", value: "sentence" },
        ],
        default: "upper",
    },
    shortMessages: { type: OptionType.BOOLEAN, description: "Also convert messages shorter than three characters.", default: false },
});

const URL_PATTERN = /https?:\/\/[^\s<>]+/g;

function changeCase(text, mode) {
    if (mode === "upper") return text.toUpperCase();
    if (mode === "lower") return text.toLowerCase();
    if (mode === "title") return text.replace(/\b([a-z])(\w*)/gi, (_, first, rest) => first.toUpperCase() + rest.toLowerCase());
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());
}

// URLs are case sensitive after the host, so they are taken out of the text, converted around, and
// put back unchanged.
function convert(text, mode) {
    const urls = [];
    const masked = text.replace(URL_PATTERN, (url) => {
        urls.push(url);
        return `\u0000${urls.length - 1}\u0000`;
    });
    return changeCase(masked, mode).replace(/\u0000(\d+)\u0000/g, (_, index) => urls[Number(index)] ?? "");
}

export default definePlugin({
    name: "WriteUpperCase",
    description: "Converts outgoing messages to uppercase, lowercase, title case or sentence case as they are sent.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "fun", "utility"],
    settings,

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            // Slash commands are handled by the plugin that owns them; changing their case would
            // break them (and any command parser that checks the exact spelling).
            if (/^\s*\//.test(text)) return text;
            if (!settings.store.shortMessages && text.trim().length < 3) return text;
            return convert(text, settings.store.mode);
        }));
    },
});
