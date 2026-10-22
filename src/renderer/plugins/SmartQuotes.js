import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const settings = definePluginSettings({
    quotes: { type: OptionType.BOOLEAN, description: "Use curly quotes and apostrophes.", default: true },
    dashes: { type: OptionType.BOOLEAN, description: "Turn -- into an em dash and ... into an ellipsis.", default: true },
});

function smart(text) {
    let value = text;
    if (settings.store.quotes) {
        value = value
            .replace(/(^|[\s([{])"/g, "$1\u201c")
            .replace(/"/g, "\u201d")
            .replace(/'/g, "\u2019");
    }
    if (settings.store.dashes) {
        value = value.replace(/\.\.\./g, "\u2026").replace(/(^|\s)--(\s|$)/g, "$1\u2014$2");
    }
    return value;
}

function typography(text) {
    // Never touch code spans: they are meant to be literal.
    return String(text)
        .split(/(`[^`]*`)/)
        .map((part, index) => (index % 2 ? part : smart(part)))
        .join("");
}

export default definePlugin({
    name: "SmartQuotes",
    description: "Turns straight quotes, double hyphens and three dots into typographic quotes, dashes and ellipses when you send. Code is left alone.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        ctx.cleanup(interceptSend((text) => (String(text).includes("```") ? text : typography(text))));
    },
});
