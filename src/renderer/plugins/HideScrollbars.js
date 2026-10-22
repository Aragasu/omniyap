import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    showOnHover: { type: OptionType.BOOLEAN, description: "Reveal the scrollbar when hovering its container.", default: true },
    width: { type: OptionType.SLIDER, description: "Scrollbar width when visible.", default: 6, min: 0, max: 14, step: 1 },
});

export default definePlugin({
    name: "HideScrollbars",
    description: "Hides the chunky scrollbars in the channel list, members and messages until you actually need them.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            document.documentElement.style.setProperty("--omniyap-scrollbar", `${Math.max(0, Number(settings.store.width) || 0)}px`);
            document.documentElement.classList.toggle("omniyap-scrollbar-hover", !!settings.store.showOnHover);
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            document.documentElement.style.removeProperty("--omniyap-scrollbar");
            document.documentElement.classList.remove("omniyap-scrollbar-hover");
        });
        apply();
        ctx.css(`
            *{scrollbar-width:thin;scrollbar-color:transparent transparent}
            *::-webkit-scrollbar{width:var(--omniyap-scrollbar,6px);height:var(--omniyap-scrollbar,6px)}
            *::-webkit-scrollbar-thumb{background:transparent;border-radius:8px}
            .omniyap-scrollbar-hover *:hover{scrollbar-color:#3a3a4a transparent}
            .omniyap-scrollbar-hover *:hover::-webkit-scrollbar-thumb{background:#3a3a4a}
        `);
    },
});
