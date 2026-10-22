import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    emoji: { type: OptionType.STRING, description: "The companion emoji.", default: "🫧" },
    size: { type: OptionType.SLIDER, description: "Companion size in pixels.", default: 26, min: 14, max: 56, step: 2 },
    spring: { type: OptionType.SLIDER, description: "How quickly it catches up (higher is snappier).", default: 12, min: 3, max: 30, step: 1 },
    hideOnIdle: { type: OptionType.BOOLEAN, description: "Fade out when the mouse stops moving.", default: true },
});

export default definePlugin({
    name: "CursorBuddy",
    description: "A little emoji buddy trails your mouse pointer and naps when you stop moving.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "appearance"],
    settings,

    start(ctx) {
        const buddy = h("div", { class: "omniyap-buddy", "aria-hidden": "true" }, settings.store.emoji || "🫧");
        let x = innerWidth / 2;
        let y = innerHeight / 2;
        let targetX = x;
        let targetY = y;
        let lastMove = performance.now();

        const onMove = (event) => {
            targetX = event.clientX + 18;
            targetY = event.clientY + 14;
            lastMove = performance.now();
            buddy.style.opacity = "1";
        };

        const tick = () => {
            if (document.hidden) return;
            const spring = Math.max(3, Math.min(30, Number(settings.store.spring) || 12)) / 100;
            x += (targetX - x) * spring;
            y += (targetY - y) * spring;
            const size = Math.max(14, Math.min(56, Number(settings.store.size) || 26));
            buddy.style.fontSize = `${size}px`;
            buddy.textContent = settings.store.emoji || "🫧";
            buddy.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) rotate(${Math.round((targetX - x) * 0.35)}deg)`;
            if (settings.store.hideOnIdle && performance.now() - lastMove > 4000) buddy.style.opacity = "0.25";
        };

        document.addEventListener("mousemove", onMove, true);
        (document.body || document.documentElement).append(buddy);
        ctx.interval(tick, 40);
        ctx.cleanup(() => {
            document.removeEventListener("mousemove", onMove, true);
            buddy.remove();
        });
        ctx.css(`
            .omniyap-buddy{position:fixed;left:0;top:0;z-index:2147482999;pointer-events:none;line-height:1;
                filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));transition:opacity .8s ease;will-change:transform}
        `);
    },
});
