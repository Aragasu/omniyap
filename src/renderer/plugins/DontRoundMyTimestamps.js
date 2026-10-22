import { definePlugin, messages } from "../core/api.js";

export default definePlugin({
    name: "DontRoundMyTimestamps",
    description: "Shows the exact time, including seconds, instead of Yapper's rounded minute.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            const raw = message?.created_at ?? message?.timestamp ?? message?.createdAt;
            const date = raw ? new Date(raw) : null;
            if (!date || Number.isNaN(date.getTime())) return;
            const time = el.querySelector(".msg-time, .msg-head time, time[datetime], .msg-timestamp");
            if (!time) return;
            const exact = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            if (time.dataset.omniyapExact !== exact) {
                time.dataset.omniyapExact = exact;
                time.textContent = exact;
                time.title = date.toLocaleString();
            }
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-exact]{font-variant-numeric:tabular-nums;letter-spacing:-.2px}`);
    },
});
