import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { addMessageAction, authorOf } from "./_shared.js";

const settings = definePluginSettings({
    rate: { type: OptionType.SLIDER, description: "Speech speed.", default: 1, min: 0.5, max: 2, step: 0.1 },
    autoRead: {
        type: OptionType.BOOLEAN,
        description: "Read every new message in the open channel aloud.",
        default: false,
    },
});

export default definePlugin({
    name: "ReadAloud",
    description: "Reads a message aloud, or every incoming message if you want.",
    authors: [{ name: "OmniYap" }],
    tags: ["accessibility", "chat"],
    settings,

    start(ctx) {
        if (!("speechSynthesis" in window)) {
            ctx.log.warn("speech synthesis is unavailable");
            return;
        }

        const speak = (text, author) => {
            if (!text) return;
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`${author} says: ${text}`);
            utterance.rate = Number(settings.store.rate) || 1;
            speechSynthesis.speak(utterance);
        };

        const decorate = ({ el, textEl }) => {
            if (!textEl || el.querySelector('[data-omniyap-action="Read"]')) return;
            addMessageAction(el, {
                label: "Read",
                title: "Read this message aloud",
                html: "▸",
                onClick: () => speak(textEl.innerText, authorOf(el).name || "Someone"),
            });
        };
        ctx.cleanup(messages.decorate(decorate));

        if (settings.store.autoRead) {
            const seen = new Set();
            ctx.watch(".msg[data-message-id]", (row) => {
                const id = row.getAttribute("data-message-id");
                if (!id || seen.has(id)) return;
                seen.add(id);
                const text = row.querySelector(":scope > .msg-body > .msg-text")?.innerText;
                if (text) speak(text, row.querySelector(".msg-author")?.textContent?.trim() || "Someone");
            });
        }

        ctx.css(`[data-omniyap-action="Read"]{font-size:12px;width:26px;height:26px;padding:0}`);
        ctx.cleanup(() => speechSynthesis.cancel());
    },
});
