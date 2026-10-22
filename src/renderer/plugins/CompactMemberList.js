import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    hideStatus: { type: OptionType.BOOLEAN, description: "Hide the little status line under each name.", default: true },
    avatar: { type: OptionType.SLIDER, description: "Avatar size in pixels.", default: 24, min: 16, max: 32, step: 2 },
});

export default definePlugin({
    name: "CompactMemberList",
    description: "Makes the member list tighter by shrinking avatars and removing status lines, fitting more people on screen.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "servers"],
    settings,

    start(ctx) {
        const apply = () => {
            document.documentElement.style.setProperty("--omniyap-member-avatar", `${Math.max(16, Number(settings.store.avatar) || 24)}px`);
            document.documentElement.classList.toggle("omniyap-hide-member-status", !!settings.store.hideStatus);
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            document.documentElement.style.removeProperty("--omniyap-member-avatar");
            document.documentElement.classList.remove("omniyap-hide-member-status");
        });
        apply();
        ctx.css(`
            .side-panel .pick-row{padding:3px 8px!important;gap:7px!important}
            .side-panel .pick-row .avatar{width:var(--omniyap-member-avatar,24px)!important;height:var(--omniyap-member-avatar,24px)!important;font-size:9px!important}
            .side-panel .pick-row-text{gap:0!important}
            .side-panel .section-label{padding-top:8px!important;padding-bottom:2px!important}
            .omniyap-hide-member-status .side-panel .pick-row-sub,
            .omniyap-hide-member-status .side-panel .pick-row-text > span:not(.pick-row-name){display:none!important}
        `);
    },
});
