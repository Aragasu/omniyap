import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "NoPendingCount",
    description: "Hides the little pending/failed counters on channels and messages.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    start(ctx) {
        ctx.css(`
            .pending-count, .pending-badge, [class*="pending-count"], [class*="pendingCount"],
            .msg .pending, .channel-row .badge.pending, .rail-item .pending {
                display: none !important;
            }
        `);
    },
});
