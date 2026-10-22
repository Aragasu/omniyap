import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    opacity: { type: OptionType.SLIDER, description: "How dim muted channels look (percent).", default: 45, min: 10, max: 90, step: 5 },
});

export default definePlugin({
    name: "DimMutedChannels",
    description: "Fades muted channels in the sidebar so your eye skips them, while unread channels stay bright.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "navigation"],
    settings,

    start(ctx) {
        const update = () => {
            const muted = new Set(Object.keys(store.getState()?.muted || {}));
            document.querySelectorAll(".channel-row[data-nav-chan]").forEach((row) => {
                row.classList.toggle("omniyap-muted-dim", muted.has(row.getAttribute("data-nav-chan")));
            });
        };
        ctx.onMutate(update);
        ctx.on("store:change", (state, previous) => {
            if (state.muted !== previous.muted) update();
        });
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-muted-dim").forEach((row) => row.classList.remove("omniyap-muted-dim")));
        ctx.css(`
            .channel-row.omniyap-muted-dim > .channel-main{opacity:calc(var(--omniyap-dim,45) / 100)}
            .channel-row.omniyap-muted-dim.unread > .channel-main{opacity:1}
            .channel-row.omniyap-muted-dim:hover > .channel-main{opacity:1}
        `);
        const apply = () => document.documentElement.style.setProperty("--omniyap-dim", String(Math.max(10, Number(settings.store.opacity) || 45)));
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => document.documentElement.style.removeProperty("--omniyap-dim"));
        apply();
        update();
    },
});
