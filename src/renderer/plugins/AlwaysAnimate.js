import { definePlugin } from "../core/api.js";

// Yapper already serves animated avatars for free; some surfaces still pause them (pickers,
// reduced-motion settings, lazy lists). This keeps every animation running.
export default definePlugin({
    name: "AlwaysAnimate",
    description: "Never freeze animated avatars, emoji or decorations.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    start(ctx) {
        ctx.css(`
            img.avatar-pic.live, img.emoji, img.avatar-deco.live, .avatar canvas { animation-play-state: running !important; }
            @media (prefers-reduced-motion: reduce) {
                img.avatar-pic.live, img.emoji, img.avatar-deco.live { animation: none !important; }
            }
        `);
    },
});
