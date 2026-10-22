import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    thickness: { type: OptionType.SLIDER, description: "Outline thickness in pixels.", default: 2, min: 1, max: 4, step: 1 },
    colour: { type: OptionType.STRING, description: "Outline colour.", default: "#c48bff" },
});

export default definePlugin({
    name: "FocusRings",
    description: "Adds a strong, consistent focus outline for keyboard users on every button, link, input and message.",
    authors: [{ name: "OmniYap" }],
    tags: ["accessibility", "appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            document.documentElement.style.setProperty("--omniyap-focus-width", `${Math.max(1, Number(settings.store.thickness) || 2)}px`);
            document.documentElement.style.setProperty("--omniyap-focus-colour", String(settings.store.colour || "#c48bff"));
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            document.documentElement.style.removeProperty("--omniyap-focus-width");
            document.documentElement.style.removeProperty("--omniyap-focus-colour");
        });
        apply();
        ctx.css(`
            :focus-visible{outline:var(--omniyap-focus-width,2px) solid var(--omniyap-focus-colour,#c48bff)!important;
                outline-offset:2px!important;border-radius:4px}
            button:focus:not(:focus-visible),a:focus:not(:focus-visible){outline:none!important}
        `);
    },
});
