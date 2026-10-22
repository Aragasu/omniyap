import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    colour: { type: OptionType.STRING, description: "Selection colour (any CSS colour).", default: "#8b39fd" },
    opacity: { type: OptionType.SLIDER, description: "Selection opacity (percent).", default: 38, min: 10, max: 80, step: 4 },
});

function hexToRgba(hex, alpha) {
    const value = String(hex || "").trim();
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (!match) return `rgba(139,57,253,${alpha})`;
    let raw = match[1];
    if (raw.length === 3) raw = [...raw].map((char) => char + char).join("");
    const [r, g, b] = [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16));
    return `rgba(${r},${g},${b},${alpha})`;
}

export default definePlugin({
    name: "AccentSelection",
    description: "Changes the text selection colour to your accent, so highlighted text looks deliberate instead of default blue.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "accessibility"],
    settings,

    start(ctx) {
        const apply = () => {
            document.documentElement.style.setProperty(
                "--omniyap-selection",
                hexToRgba(settings.store.colour, Math.max(0.1, Math.min(0.8, (Number(settings.store.opacity) || 38) / 100))),
            );
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => document.documentElement.style.removeProperty("--omniyap-selection"));
        apply();
        ctx.css(`
            ::selection{background:var(--omniyap-selection,rgba(139,57,253,.38))!important;color:inherit!important}
            ::-moz-selection{background:var(--omniyap-selection,rgba(139,57,253,.38))!important}
        `);
    },
});
