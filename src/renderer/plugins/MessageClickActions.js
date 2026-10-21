import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { insertIntoComposer } from "./_shared.js";

const settings = definePluginSettings({
    middleClickQuote: {
        type: OptionType.BOOLEAN,
        description: "Middle-click a message to quote its text.",
        default: true,
    },
    shiftClickCopy: {
        type: OptionType.BOOLEAN,
        description: "Shift-click a message to copy its text.",
        default: true,
    },
});

export default definePlugin({
    name: "MessageClickActions",
    description: "Middle-click to quote, Shift-click to copy a message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const onMouseDown = (event) => {
            if (event.target instanceof Element && event.target.closest("a, input, textarea")) return;
            const row = event.target instanceof Element ? event.target.closest(".msg[data-message-id]") : null;
            if (!row) return;
            const info = messages.info(row);
            const text = info.textEl?.innerText?.trim();
            if (!text) return;

            if (event.button === 1 && settings.store.middleClickQuote) {
                event.preventDefault();
                insertIntoComposer(text.split("\n").map((line) => `> ${line}`).join("\n") + "\n\n");
            } else if (event.button === 0 && event.shiftKey && settings.store.shiftClickCopy) {
                event.preventDefault();
                navigator.clipboard.writeText(text);
            }
        };

        document.addEventListener("mousedown", onMouseDown, true);
        ctx.cleanup(() => document.removeEventListener("mousedown", onMouseDown, true));
    },
});
