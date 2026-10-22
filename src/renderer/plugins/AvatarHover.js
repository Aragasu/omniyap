import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    scale: { type: OptionType.SLIDER, description: "Hover zoom factor (percent).", default: 260, min: 150, max: 500, step: 10 },
    delay: { type: OptionType.SLIDER, description: "Delay before zooming, in milliseconds.", default: 120, min: 0, max: 600, step: 20 },
    round: { type: OptionType.BOOLEAN, description: "Keep the zoomed avatar circular.", default: true },
});

export default definePlugin({
    name: "AvatarHover",
    description: "Pops avatars up to a readable size when you hover them, without opening the profile.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "utility", "chat"],
    settings,

    start(ctx) {
        const update = () => {
            const scale = Math.max(1.5, Math.min(5, (Number(settings.store.scale) || 260) / 100));
            ctx.css(`
                .msg .avatar, .members-panel .avatar, .user-bar .avatar{position:relative;z-index:1;
                    transition:transform .16s ease ${Math.max(0, Number(settings.store.delay))}ms,box-shadow .16s ease}
                .msg .avatar:hover, .members-panel .avatar:hover{z-index:40;transform:scale(${scale});
                    box-shadow:0 10px 30px rgba(0,0,0,.55);border-radius:${settings.store.round ? "50%" : "8px"}}
                .msg:hover .avatar:hover{transform-origin:center left}
            `);
        };

        update();
        ctx.cleanup(settings.onChange(update));
    },
});
