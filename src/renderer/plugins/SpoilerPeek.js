import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    opacity: { type: OptionType.SLIDER, description: "How blurred a spoiler is until you hover it.", default: 55, min: 0, max: 90, step: 5 },
});

export default definePlugin({
    name: "SpoilerPeek",
    description: "Reveals a spoiler while your mouse is over it, then hides it again. No clicking, nothing stays revealed.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            document.documentElement.style.setProperty("--omniyap-spoiler-blur", `${Math.max(0, Number(settings.store.opacity) || 55) / 10}px`);
        };
        ctx.cleanup(settings.onChange(apply));
        apply();
        ctx.cleanup(() => document.documentElement.style.removeProperty("--omniyap-spoiler-blur"));
        ctx.css(`
            .msg-text .spoiler,
            .msg-text [class*="spoiler"]{
                filter:blur(var(--omniyap-spoiler-blur,5.5px));transition:filter .14s ease;cursor:help
            }
            .msg-text .spoiler:hover,
            .msg-text [class*="spoiler"]:hover{filter:blur(0)}
        `);
    },
});
