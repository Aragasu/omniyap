import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    height: { type: OptionType.SLIDER, description: "Maximum media height in pixels.", default: 420, min: 160, max: 900, step: 20 },
    wide: { type: OptionType.BOOLEAN, description: "Let taller media use the full message width.", default: true },
});

export default definePlugin({
    name: "ImageMaxHeight",
    description: "Caps how tall images, GIFs and videos can be in chat, so one photo cannot fill the whole window.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "appearance"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            const height = Math.max(160, Math.min(900, Number(settings.store.height) || 420));
            root.style.setProperty("--omniyap-media-max", `${height}px`);
            root.style.setProperty("--omniyap-media-width", settings.store.wide ? "100%" : "auto");
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            root.style.removeProperty("--omniyap-media-max");
            root.style.removeProperty("--omniyap-media-width");
        });
        ctx.css(`
            .msg-image img, .msg-body img, .msg-attachment img, .msg video{
                max-height:var(--omniyap-media-max)!important;width:var(--omniyap-media-width)!important;
                object-fit:contain!important;height:auto!important}
        `);
    },
});
