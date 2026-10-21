import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always show a message's action buttons instead of only on hover.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    start(ctx) {
        ctx.css(`
            .msg-actions { opacity: 1 !important; pointer-events: auto !important; }
            .msg:not(:hover) .msg-actions { opacity: .55 !important; }
            .msg:hover .msg-actions { opacity: 1 !important; }
        `);
    },
});
