import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "NoTypingAnimation",
    description: "Stop the bouncing typing dots; the indicator stays but holds still.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    start(ctx) {
        ctx.css(`
            .typing .dots span, .typing-dots span, .typing-indicator span,
            .typing span[class*="dot"], .typing-people .dot {
                animation: none !important;
                opacity: .7 !important;
                transform: none !important;
            }
        `);
    },
});
