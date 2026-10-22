import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const settings = definePluginSettings({
    text: { type: OptionType.STRING, description: "Signature appended to every message. Supports {user}, {date} and {time}.", default: "— {user}", multiline: true },
    separator: {
        type: OptionType.SELECT,
        description: "What goes between the message and the signature.",
        options: [
            { label: "New line", value: "newline" },
            { label: "Blank line", value: "blank" },
            { label: "Same line", value: "space" },
        ],
        default: "newline",
    },
    skipShort: { type: OptionType.BOOLEAN, description: "Only sign messages longer than one character.", default: true },
});

function render() {
    return String(settings.store.text || "")
        .replace(/\{user\}/g, store.displayName(store.myId()) || "you")
        .replace(/\{date\}/g, new Date().toLocaleDateString())
        .replace(/\{time\}/g, new Date().toLocaleTimeString());
}

export default definePlugin({
    name: "Signature",
    description: "Adds a personal signature to the end of every message you send.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "customisation", "utility"],
    settings,

    start(ctx) {
        const signature = () => render().trim();
        const separator = () => settings.store.separator === "blank" ? "\n\n" : settings.store.separator === "space" ? " " : "\n";

        ctx.cleanup(interceptSend((text) => {
            const sig = signature();
            if (!sig) return text;
            if (settings.store.skipShort && text.trim().length < 2) return text;
            if (text.endsWith(sig)) return text;
            return `${text.replace(/\s+$/, "")}${separator()}${sig}`;
        }));

        ctx.cleanup(() => {
            // Nothing visual to undo.
        });
    },
});
