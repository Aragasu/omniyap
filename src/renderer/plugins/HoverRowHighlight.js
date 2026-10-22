import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    strength: { type: OptionType.SLIDER, description: "Highlight opacity (percent).", default: 5, min: 2, max: 16, step: 1 },
    accent: { type: OptionType.BOOLEAN, description: "Tint the highlight with the app accent colour.", default: true },
});

export default definePlugin({
    name: "HoverRowHighlight",
    description: "Gives the message under the cursor a soft highlight, so it is obvious which row an action belongs to.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            const strength = Math.max(2, Math.min(16, Number(settings.store.strength) || 5)) / 100;
            root.style.setProperty("--omniyap-hover-row", `rgba(255,255,255,${strength})`);
            root.style.setProperty("--omniyap-hover-row-accent", `rgba(139,57,253,${strength * 1.6})`);
            root.toggleAttribute("data-omniyap-hover-accent", !!settings.store.accent);
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            root.style.removeProperty("--omniyap-hover-row");
            root.style.removeProperty("--omniyap-hover-row-accent");
            root.removeAttribute("data-omniyap-hover-accent");
        });
        ctx.css(`
            .msg:hover{background:var(--omniyap-hover-row)!important;border-radius:6px}
            [data-omniyap-hover-accent] .msg:hover{background:var(--omniyap-hover-row-accent)!important}
        `);
    },
});
