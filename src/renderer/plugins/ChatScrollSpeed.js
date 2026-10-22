import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    factor: { type: OptionType.SLIDER, description: "Scroll multiplier (percent).", default: 130, min: 60, max: 300, step: 10 },
    horizontal: { type: OptionType.BOOLEAN, description: "Also speed up horizontal wheel movement.", default: false },
});

export default definePlugin({
    name: "ChatScrollSpeed",
    description: "Changes how fast the mouse wheel scrolls the message list, useful on trackpads and high-resolution wheels.",
    authors: [{ name: "OmniYap" }],
    tags: ["input", "accessibility"],
    settings,

    start(ctx) {
        const onWheel = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const scroller = event.target instanceof Element ? event.target.closest(".messages, .msg-list, .chat-scroll") : null;
            if (!scroller) return;
            const factor = Math.max(0.6, Math.min(3, (Number(settings.store.factor) || 130) / 100));
            if (Math.abs(event.deltaY) < 1 && !settings.store.horizontal) return;
            event.preventDefault();
            scroller.scrollTop += event.deltaY * factor;
            if (settings.store.horizontal) scroller.scrollLeft += event.deltaX * factor;
        };

        window.addEventListener("wheel", onWheel, { passive: false });
        ctx.cleanup(() => window.removeEventListener("wheel", onWheel));
    },
});
