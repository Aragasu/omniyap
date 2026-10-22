import { definePlugin, messages, store } from "../core/api.js";
import { addMessageAction, authorOf, profileUrl } from "./_shared.js";

export default definePlugin({
    name: "CopyUserURLs",
    description: "Adds a message action that copies a link to the author's Yapper profile.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "chat"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            if (el.querySelector('[data-omniyap-action="Profile URL"]')) return;
            const author = authorOf(el);
            const userId = message?.author_id || message?.user_id || author.id;
            if (!userId) return;
            addMessageAction(el, {
                label: "Profile URL",
                title: "Copy a link to this profile",
                html: "🔗",
                onClick: () => {
                    const url = profileUrl(userId);
                    navigator.clipboard.writeText(url).then(
                        () => ctx.toast(`Copied ${store.username(userId)}'s profile link`, { type: "success" }),
                        () => ctx.toast("Could not copy the link", { type: "error" }),
                    );
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Profile URL"]{font-size:12px;width:26px;height:26px;padding:0}`);
    },
});
