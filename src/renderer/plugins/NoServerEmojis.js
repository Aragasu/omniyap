import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "NoServerEmojis",
    description: "Hides the server emoji section from the emoji picker.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    start(ctx) {
        ctx.css(`
            [class*="emoji-picker"] [class*="server"], [class*="emojiPicker"] [class*="server"],
            .emoji-picker [class*="guild"], .emoji-picker .server-emojis,
            [class*="emoji-picker"] [aria-label*="Server emoji"] {
                display: none !important;
            }
        `);
    },
});
