import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    limit: {
        type: OptionType.NUMBER,
        description: "Characters per message.",
        default: 1900,
    },
    delay: {
        type: OptionType.SLIDER,
        description: "Milliseconds between parts.",
        default: 350,
        min: 0,
        max: 1500,
        step: 50,
    },
    splitAtNewlines: {
        type: OptionType.BOOLEAN,
        description: "Prefer splitting at line breaks.",
        default: true,
    },
});

function chunks(text, limit, preferNewlines) {
    if (text.length <= limit) return [text];
    const parts = [];
    let rest = text;
    while (rest.length > limit) {
        let cut = limit;
        if (preferNewlines) {
            const slice = rest.slice(0, limit);
            const newline = slice.lastIndexOf("\n");
            const space = slice.lastIndexOf(" ");
            if (newline > limit * 0.5) cut = newline + 1;
            else if (space > limit * 0.5) cut = space + 1;
        }
        parts.push(rest.slice(0, cut));
        rest = rest.slice(cut);
    }
    if (rest) parts.push(rest);
    return parts;
}

export default definePlugin({
    name: "SplitLargeMessages",
    description: "Long messages are sent in several parts instead of being cut off at 2000 characters.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let sending = false;

        const sendParts = async (text) => {
            const parts = chunks(text, Math.min(1990, Number(settings.store.limit) || 1900), settings.store.splitAtNewlines);
            if (parts.length <= 1) return false;
            const composer = getComposer();
            if (!composer) return false;
            sending = true;
            try {
                for (let i = 0; i < parts.length; i++) {
                    setNativeValue(composer, parts[i]);
                    composer.focus();
                    await new Promise((resolve) => setTimeout(resolve, 40));
                    document.querySelector(".composer .send-btn, .composer-box .send-btn")?.click();
                    if (i < parts.length - 1) await new Promise((resolve) => setTimeout(resolve, Number(settings.store.delay) || 350));
                }
                ctx.log.info(`sent a ${text.length}-character message in ${parts.length} parts`);
            } finally {
                sending = false;
            }
            return true;
        };

        const onSend = (event) => {
            if (sending) return;
            const composer = getComposer();
            if (!composer) return;
            const text = composer.value;
            if (text.length <= 1990) return;

            const target = event.target instanceof Element ? event.target : null;
            const isSendButton = target?.closest(".send-btn");
            const isEnter = event instanceof KeyboardEvent && event.key === "Enter" && !event.shiftKey;
            if (!isSendButton && !isEnter) return;

            event.preventDefault();
            event.stopPropagation();
            void sendParts(text);
        };

        document.addEventListener("click", onSend, true);
        document.addEventListener("keydown", onSend, true);
        ctx.cleanup(() => {
            document.removeEventListener("click", onSend, true);
            document.removeEventListener("keydown", onSend, true);
        });
    },
});
