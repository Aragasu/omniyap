import { definePlugin, messages } from "../core/api.js";
import { addMessageAction, messageUrl } from "./_shared.js";

export default definePlugin({
    name: "CopyMessageLink",
    description: "Adds a Copy link action to every message, which copies a URL that jumps straight to it.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    enabledByDefault: true,

    start(ctx) {
        const decorate = ({ el, id, message }) => {
            if (el.querySelector('[data-omniyap-action="Copy link"]')) return;
            const messageId = id || message?.id;
            if (!messageId) return;
            addMessageAction(el, {
                label: "Copy link",
                title: "Copy a link to this message",
                html: "⧉",
                onClick: () => ctx.copy(messageUrl(messageId, message?.channel_id), "Message link copied"),
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Copy link"]{font-size:13px;width:26px;height:26px;padding:0}`);
    },
});
