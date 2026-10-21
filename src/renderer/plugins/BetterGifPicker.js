import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    width: { type: OptionType.SLIDER, description: "Picker width in pixels.", default: 460, min: 320, max: 720, step: 20 },
    height: { type: OptionType.SLIDER, description: "Picker height in pixels.", default: 520, min: 280, max: 800, step: 20 },
    columns: { type: OptionType.SLIDER, description: "GIFs per row.", default: 3, min: 2, max: 5, step: 1 },
});

const PICKER = ".gif-picker, [class*='gif-picker'], [class*='gifPicker'], [data-testid*='gif']";

export default definePlugin({
    name: "BetterGifPicker",
    description: "A larger GIF picker with more columns and an auto-focused search box.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            ctx.css(`
                ${PICKER}{
                    width: ${settings.store.width}px !important;
                    max-width: 92vw !important;
                    height: ${settings.store.height}px !important;
                    max-height: 70vh !important;
                    resize: both;
                }
                ${PICKER} [class*="grid"], ${PICKER} [class*="results"]{
                    grid-template-columns: repeat(${settings.store.columns}, minmax(0, 1fr)) !important;
                }
                ${PICKER} img{max-height: 190px !important; object-fit: cover}
            `);
        };
        apply();

        const focusSearch = () => {
            const picker = document.querySelector(PICKER);
            if (!picker) return;
            const input = picker.querySelector("input[type='text'], input[type='search'], input:not([type])");
            if (input instanceof HTMLElement && document.activeElement !== input) input.focus();
        };
        ctx.onMutate(() => {
            if (document.querySelector(PICKER)) focusSearch();
        });
        ctx.cleanup(settings.onChange(() => apply()));
    },
});
