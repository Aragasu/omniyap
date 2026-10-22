import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    radius: { type: OptionType.SLIDER, description: "Corner rounding percentage (0 is square, 50 is a circle).", default: 30, min: 0, max: 50, step: 5 },
});

export default definePlugin({
    name: "SquareAvatars",
    description: "Changes avatar corners from circles to rounded squares, or anything in between, everywhere in the app.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            document.documentElement.style.setProperty("--omniyap-avatar-radius", `${Math.max(0, Math.min(50, Number(settings.store.radius) || 0))}%`);
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => document.documentElement.style.removeProperty("--omniyap-avatar-radius"));
        apply();
        ctx.css(`
            .avatar,.avatar-clip,.avatar img,.avatar-deco,.profile-card-avatar .avatar,
            .friend-row .avatar,.pick-row .avatar,.msg-gutter .avatar{
                border-radius:var(--omniyap-avatar-radius,30%)!important
            }
        `);
    },
});
