import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    pulse: { type: OptionType.BOOLEAN, description: "Gently pulse unread channels.", default: true },
    mentions: { type: OptionType.BOOLEAN, description: "Use a warmer colour when you are mentioned.", default: true },
});

export default definePlugin({
    name: "UnreadGlow",
    description: "Makes unread channels glow softly so new messages are visible at a glance, with a warmer glow for mentions.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "navigation"],
    settings,

    start(ctx) {
        document.documentElement.classList.toggle("omniyap-unread-pulse", !!settings.store.pulse);
        ctx.cleanup(() => document.documentElement.classList.remove("omniyap-unread-pulse"));
        ctx.css(`
            .channel-row.unread > .channel-main{background:linear-gradient(90deg,rgba(139,57,253,.13),transparent 70%);
                border-radius:6px;box-shadow:inset 2px 0 0 #8b39fd}
            .channel-row.unread > .channel-main .name{color:#eee7ff;font-weight:600}
            .channel-row.unread > .channel-main .channel-glyph{color:#c48bff}
            .omniyap-unread-pulse .channel-row.unread > .channel-main{animation:omniyap-unread-glow 3.2s ease-in-out infinite}
            @keyframes omniyap-unread-glow{0%,100%{background-color:rgba(139,57,253,.04)}50%{background-color:rgba(139,57,253,.13)}}
            .channel-row.unread .omniyap-chan-mentions{background:#f0a75d!important;color:#1a1206!important}
        `);
        if (settings.store.mentions) {
            ctx.css(`
                .channel-row.unread .channel-tools [class*="mention"],
                .channel-row.unread .channel-tools [class*="badge"]{box-shadow:0 0 0 1px rgba(240,167,93,.4);background:#f0a75d;color:#241705}
            `);
        }
    },
});
