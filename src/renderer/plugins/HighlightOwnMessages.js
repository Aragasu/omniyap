import { definePlugin, messages, store } from "../core/api.js";

export default definePlugin({
    name: "HighlightOwnMessages",
    description: "Tints the background of your own messages so they are easy to spot in a busy conversation.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            const me = store.myId();
            const author = message?.author_id || message?.user_id || message?.authorId || message?.userId;
            el.classList.toggle("omniyap-own-msg", !!me && author === me);
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-own-msg").forEach((el) => el.classList.remove("omniyap-own-msg")));
        ctx.css(`
            .msg.omniyap-own-msg{background:linear-gradient(90deg,rgba(139,57,253,.09),rgba(139,57,253,.025) 55%,transparent);
                border-radius:8px}
            .msg.omniyap-own-msg .msg-body{box-shadow:inset 2px 0 0 rgba(139,57,253,.44);padding-left:10px;border-radius:3px}
        `);
    },
});
