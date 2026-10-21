import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    density: {
        type: OptionType.SELECT,
        description: "How tight the layout should be.",
        options: [
            { label: "Compact", value: "compact" },
            { label: "Very compact", value: "ultra" },
        ],
        default: "compact",
    },
    hideAvatars: {
        type: OptionType.BOOLEAN,
        description: "Hide message avatars for even more density.",
        default: false,
    },
});

export default definePlugin({
    name: "CompactLayout",
    description: "Fits more messages on screen with tighter spacing.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    settings,

    start(ctx) {
        const apply = () => {
            const ultra = settings.store.density === "ultra";
            ctx.css(`
                .msg{padding-top:${ultra ? 0 : 1}px !important;padding-bottom:${ultra ? 0 : 1}px !important}
                .msg-head{gap:6px !important}
                .msg-text{line-height:${ultra ? 1.25 : 1.35} !important;font-size:${ultra ? 13 : 13.5}px !important}
                .msg-gutter{width:${ultra ? 28 : 34}px !important}
                .msg-gutter .avatar{width:${ultra ? 22 : 28}px !important;height:${ultra ? 22 : 28}px !important}
                .channel-row{padding-top:${ultra ? 1 : 3}px !important;padding-bottom:${ultra ? 1 : 3}px !important}
                .messages{padding-top:4px !important}
                ${settings.store.hideAvatars ? ".msg-gutter{display:none !important}" : ""}
                ${settings.store.hideAvatars ? ".msg{padding-left:14px !important}" : ""}
            `);
        };
        apply();
        ctx.cleanup(settings.onChange(() => apply()));
    },
});
