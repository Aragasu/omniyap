import { definePlugin, messages } from "../core/api.js";
import { addMessageAction, insertIntoComposer, authorOf } from "./_shared.js";

export default definePlugin({
    name: "Quoter",
    description: "Quote a message into the composer as a > block.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const decorate = ({ el, message, textEl }) => {
            if (!message || !textEl || el.querySelector('[data-omniyap-action="Quote"]')) return;
            addMessageAction(el, {
                label: "Quote",
                title: "Quote this message",
                html: "❝",
                onClick: () => {
                    const author = message.author_name || authorOf(el).name || "someone";
                    const text = textEl.innerText.trim().split("\n").map((line) => `> ${line}`).join("\n");
                    insertIntoComposer(`> **${author}**\n${text}\n\n`);
                },
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Quote"]{font-size:13px;line-height:1}`);
    },
});
