import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    minutes: { type: OptionType.SLIDER, description: "Minutes of inactivity before dimming.", default: 3, min: 1, max: 30, step: 1 },
    opacity: { type: OptionType.SLIDER, description: "Dim strength (percent).", default: 55, min: 10, max: 90, step: 5 },
    hideCursor: { type: OptionType.BOOLEAN, description: "Hide the cursor while dimmed.", default: true },
});

export default definePlugin({
    name: "IdleDim",
    description: "Dims the window after a few idle minutes so a forgotten call or chat does not light up the room.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "utility", "accessibility"],
    settings,

    start(ctx) {
        const overlay = h("div", { class: "omniyap-idle-dim", "aria-hidden": "true" });
        (document.body || document.documentElement).append(overlay);
        let timer = null;
        let dimmed = false;

        const undim = () => {
            if (dimmed) {
                dimmed = false;
                overlay.classList.remove("on");
            }
            schedule();
        };

        const dim = () => {
            dimmed = true;
            overlay.style.background = `rgba(4,4,8,${Math.max(0.1, Math.min(0.9, Number(settings.store.opacity) / 100))})`;
            overlay.classList.add("on");
        };

        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(dim, Math.max(1, Number(settings.store.minutes) || 3) * 60_000);
        };

        const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];
        const onActivity = () => undim();
        for (const name of events) window.addEventListener(name, onActivity, true);

        ctx.cleanup(settings.onChange(schedule));
        ctx.cleanup(() => {
            clearTimeout(timer);
            for (const name of events) window.removeEventListener(name, onActivity, true);
            overlay.remove();
        });
        ctx.css(`
            .omniyap-idle-dim{position:fixed;inset:0;z-index:2147483250;pointer-events:none;opacity:0;
                transition:opacity 1.2s ease;background:rgba(4,4,8,0)}
            .omniyap-idle-dim.on{opacity:1}
            ${settings.store.hideCursor ? "html:has(.omniyap-idle-dim.on){cursor:none}" : ""}
        `);
        schedule();
    },
});
