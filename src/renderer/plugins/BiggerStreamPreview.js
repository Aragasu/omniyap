import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    width: {
        type: OptionType.SLIDER,
        description: "Preview width in pixels.",
        default: 420,
        min: 280,
        max: 720,
        step: 20,
    },
});

export default definePlugin({
    name: "BiggerStreamPreview",
    description: "Makes stream previews in chat considerably larger.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "media"],
    settings,

    start(ctx) {
        const apply = () => {
            const width = Number(settings.store.width) || 420;
            ctx.css(`
                [class*="stream-preview"], [class*="streamPreview"], .stream-card, .live-preview {
                    width: ${width}px !important;
                    max-width: min(${width}px, 92vw) !important;
                    aspect-ratio: 16 / 9;
                    border-radius: 10px;
                    overflow: hidden;
                }
                [class*="stream-preview"] canvas, [class*="stream-preview"] video,
                .stream-card canvas, .live-preview canvas {
                    width: 100% !important; height: 100% !important; object-fit: cover;
                }
            `);
        };
        apply();
        ctx.cleanup(settings.onChange(() => apply()));
    },
});
