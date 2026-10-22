import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    density: { type: OptionType.SLIDER, description: "Snowflakes on screen.", default: 90, min: 20, max: 300, step: 10 },
    speed: { type: OptionType.SLIDER, description: "Fall speed.", default: 5, min: 1, max: 16, step: 1 },
    size: { type: OptionType.SLIDER, description: "Flake size.", default: 3, min: 1, max: 9, step: 1 },
    wind: { type: OptionType.SLIDER, description: "Sideways drift.", default: 2, min: -8, max: 8, step: 1 },
});

export default definePlugin({
    name: "Snowfall",
    description: "Draws a lightweight snowfall over the whole window that pauses when the app is hidden.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "appearance"],
    settings,

    start(ctx) {
        let canvas = null;
        let raf = null;
        let flakes = [];
        let last = 0;

        const stop = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = null;
            canvas?.remove();
            canvas = null;
            flakes = [];
        };

        const start = () => {
            stop();
            canvas = h("canvas", { class: "omniyap-snow", "aria-hidden": "true" });
            (document.body || document.documentElement).appendChild(canvas);
            const ratio = window.devicePixelRatio || 1;
            const resize = () => {
                canvas.width = innerWidth * ratio;
                canvas.height = innerHeight * ratio;
                canvas.style.width = `${innerWidth}px`;
                canvas.style.height = `${innerHeight}px`;
                const context = canvas.getContext("2d");
                context?.setTransform(ratio, 0, 0, ratio, 0, 0);
            };
            resize();
            const context = canvas.getContext("2d");
            if (!context) return stop();
            const count = Math.max(20, Math.min(300, Number(settings.store.density) || 90));
            flakes = Array.from({ length: count }, () => ({
                x: Math.random() * innerWidth,
                y: Math.random() * innerHeight,
                r: (1 + Math.random() * 3) * (Math.max(1, Number(settings.store.size) || 3) / 3),
                drift: (Math.random() - 0.5) * 1.6,
                speed: 0.4 + Math.random() * 0.9,
            }));

            const frame = (now) => {
                if (!canvas) return;
                raf = requestAnimationFrame(frame);
                if (document.hidden) return;
                if (now - last < 28) return;
                last = now;
                context.clearRect(0, 0, innerWidth, innerHeight);
                const speed = Math.max(1, Number(settings.store.speed) || 5) / 5;
                const wind = Number(settings.store.wind) || 0;
                for (const flake of flakes) {
                    flake.y += flake.speed * speed;
                    flake.x += flake.drift + wind * 0.16;
                    if (flake.y > innerHeight + 8) {
                        flake.y = -8;
                        flake.x = Math.random() * innerWidth;
                    }
                    if (flake.x < -8) flake.x = innerWidth + 8;
                    if (flake.x > innerWidth + 8) flake.x = -8;
                    context.beginPath();
                    context.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
                    context.fillStyle = "rgba(235,240,255,.82)";
                    context.fill();
                }
            };
            raf = requestAnimationFrame(frame);
        };

        const toggle = () => {
            if (canvas) {
                stop();
                ctx.toast("Snowfall stopped");
            } else {
                start();
                ctx.toast("Snowfall started");
            }
        };

        ctx.cleanup(ui.registerTool({
            id: "snowfall",
            label: "Snowfall",
            icon: "❄",
            description: "Toggle the snow overlay.",
            onClick: toggle,
        }));
        ctx.css(`
            .omniyap-snow{position:fixed;inset:0;z-index:2147482900;pointer-events:none}
            @media (prefers-reduced-motion: reduce){.omniyap-snow{display:none}}
        `);
        window.addEventListener("resize", resizeNoop);
        function resizeNoop() {
            if (!canvas) return;
            const ratio = window.devicePixelRatio || 1;
            canvas.width = innerWidth * ratio;
            canvas.height = innerHeight * ratio;
            canvas.style.width = `${innerWidth}px`;
            canvas.style.height = `${innerHeight}px`;
            canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        ctx.cleanup(() => {
            window.removeEventListener("resize", resizeNoop);
            stop();
        });
        start();
    },
});
