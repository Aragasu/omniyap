import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    radius: {
        type: OptionType.SLIDER,
        description: "Corner radius in pixels.",
        default: 12,
        min: 0,
        max: 28,
        step: 1,
        markers: [0, 8, 12, 20, 28],
    },
});

export default definePlugin({
    name: "RoundedCorners",
    description: "Rounds the rail, sidebar, chat, cards and media.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    settings,

    start(ctx) {
        const apply = (radius) => {
            const r = Number(radius) || 0;
            ctx.css(`
                .rail, .sidebar, .chat, .side-panel, .composer, .composer-box, .server-banner,
                .rail-item, .channel-row, .pick-row, .msg-image, .msg-body img, .msg-body video,
                .omniyap-card, .modal, .dialog { border-radius: ${r}px !important; }
                .avatar, .avatar-clip, .avatar-pic { border-radius: ${Math.min(50, r + 40)}% !important; }
            `);
        };
        apply(settings.store.radius);
        ctx.cleanup(settings.onChange((key, value) => {
            if (key === "radius") apply(value);
        }));
    },
});
