import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    width: { type: OptionType.SLIDER, description: "Scrollbar width in pixels.", default: 9, min: 4, max: 18, step: 1 },
    autoHide: { type: OptionType.BOOLEAN, description: "Show the thumb only while the pointer is over the scroller.", default: false },
});

export default definePlugin({
    name: "ScrollbarStyle",
    description: "Slimmer, rounded scrollbars that match the app's dark surface, with an optional auto-hide mode.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            const width = Math.max(4, Math.min(18, Number(settings.store.width) || 9));
            root.style.setProperty("--omniyap-scrollbar", `${width}px`);
            root.toggleAttribute("data-omniyap-scroll-autohide", !!settings.store.autoHide);
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            root.style.removeProperty("--omniyap-scrollbar");
            root.removeAttribute("data-omniyap-scroll-autohide");
        });
        ctx.css(`
            *::-webkit-scrollbar{width:var(--omniyap-scrollbar)!important;height:var(--omniyap-scrollbar)!important}
            *::-webkit-scrollbar-track{background:transparent}
            *::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:999px;border:2px solid transparent;background-clip:padding-box}
            *::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.28);background-clip:padding-box}
            *::-webkit-scrollbar-corner{background:transparent}
            [data-omniyap-scroll-autohide] *::-webkit-scrollbar-thumb{background:transparent}
            [data-omniyap-scroll-autohide] *:hover::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);background-clip:padding-box}
        `);
    },
});
