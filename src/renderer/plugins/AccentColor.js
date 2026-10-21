import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const FALLBACK = "#8b39fd";
const PRESETS = ["#8b39fd", "#ff6b4a", "#f43f5e", "#ec4899", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b"];

const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || "").trim());

function rgb(hex) {
    return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function shade(hex, factor) {
    return "#" + rgb(hex)
        .map((value) => Math.max(0, Math.min(255, Math.round(value * factor))).toString(16).padStart(2, "0"))
        .join("");
}

/** White or near-black, whichever is readable on top of the accent. */
function onColor(hex) {
    const [r, g, b] = rgb(hex).map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.55 ? "#14151a" : "#ffffff";
}

const settings = definePluginSettings({
    color: {
        type: OptionType.STRING,
        description: "Accent colour as a six-digit hex code (for example #8b39fd).",
        default: FALLBACK,
        placeholder: "#8b39fd",
    },
    palette: {
        type: OptionType.CUSTOM,
        default: "",
        description: "Pick one of the presets.",
        render(box, plugin) {
            box.append(
                h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
                    ...PRESETS.map((color) => h("button", {
                        type: "button",
                        title: color,
                        "aria-label": `Use ${color}`,
                        style: {
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: color,
                            border: "2px solid rgba(255,255,255,.35)",
                            cursor: "pointer",
                        },
                        onclick: () => plugin.settings.set("color", color),
                    })),
                ),
            );
        },
    },
});

export default definePlugin({
    name: "AccentColor",
    description: "Choose the accent colour OmniYap uses for buttons, switches, focus rings and highlights.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "customisation"],
    settings,

    start(ctx) {
        const apply = () => {
            const raw = String(settings.store.color || "").trim();
            const color = isHex(raw) ? raw : FALLBACK;
            ctx.css(`
                :root{
                    --omniyap-accent:${color};
                    --accent:${color};
                    --accent-hover:${shade(color, 0.86)};
                    --accent-soft:${color}29;
                    --on-accent:${onColor(color)};
                }
                .omniyap-root .omniyap-btn.primary,
                .omniyap-modal .omniyap-btn.primary{background:${color}!important;border-color:${color}!important;color:${onColor(color)}!important}
                .omniyap-root .omniyap-switch input:checked + span{background:${color}!important}
                .omniyap-root .omniyap-search:focus,
                .omniyap-root .omniyap-css:focus,
                .omniyap-root .omniyap-option input:focus,
                .omniyap-root .omniyap-option select:focus,
                .omniyap-root .omniyap-option textarea:focus,
                .omniyap-modal .omniyap-search:focus,
                .omniyap-modal .omniyap-css:focus{border-color:${color}!important}
                .omniyap-root .omniyap-nav button.active{background:${color}24!important;color:${onColor(color) === "#ffffff" ? "#e6dbff" : color}!important}
                .omniyap-root .omniyap-pill.active{background:${color}29!important;border-color:${color}73!important;color:#e6dbff!important}
                .omniyap-root .omniyap-logo{filter:drop-shadow(0 2px 8px ${color}73)}
            `);
        };

        apply();
        ctx.cleanup(settings.onChange((key) => {
            if (key === "color" || key === "plugins.AccentColor.color") apply();
        }));
    },
});
