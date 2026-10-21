import { definePlugin, messages } from "../core/api.js";
import { addMessageAction, authorOf, insertIntoComposer } from "./_shared.js";

export default definePlugin({
    name: "QuickMention",
    description: "Adds an @ button that mentions the message author in the composer.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            if (el.querySelector('[data-omniyap-action="Mention"]')) return;
            addMessageAction(el, {
                label: "Mention",
                title: "Mention the author",
                html: "@",
                onClick: () => {
                    const name = message?.author_username || message?.username || authorOf(el).name;
                    insertIntoComposer(`@${name} `);
                },
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Mention"]{font:700 12px Inter,system-ui,sans-serif;width:26px;height:26px;padding:0}`);
    },
});
