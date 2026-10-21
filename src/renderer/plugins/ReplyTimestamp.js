import { definePlugin, messages, store } from "../core/api.js";
import { h, formatTime } from "./_shared.js";

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Shows when the message being replied to was originally sent.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            const preview = el.querySelector(".reply-preview");
            if (!preview || preview.querySelector(".omniyap-reply-time")) return;
            const reference = message?.reply_to_id || message?.reply_to_message_id || message?.reply_to;
            const target = reference ? store.findMessage(reference) : null;
            const when = target?.created_at || target?.timestamp;
            if (!when) return;
            preview.appendChild(h("span", {
                class: "omniyap-reply-time",
                title: formatTime(when),
            }, new Date(when).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })));
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-reply-time{margin-left:6px;font-size:10px;color:#7c7f8a;flex:none}
            .reply-preview{display:flex;align-items:center}
        `);
    },
});
