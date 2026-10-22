import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    count: { type: OptionType.SLIDER, description: "Particles on screen.", default: 110, min: 30, max: 260, step: 10 },
    duration: { type: OptionType.SLIDER, description: "Seconds before the party stops itself.", default: 12, min: 3, max: 60, step: 1 },
    triggerOnMention: { type: OptionType.BOOLEAN, description: "Celebrate when someone mentions you.", default: false },
});

const COLORS = ["#8b39fd", "#ff8d8d", "#6ede9f", "#f5a524", "#63b3ed", "#f687b3", "#e3d4ff"];

export default definePlugin({
    name: "PartyMode",
    description: "Fires a short confetti overlay with Ctrl+Shift+P, or whenever you are mentioned (optional).",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "appearance"],
    settings,

    start(ctx) {
        let canvas = null;
        let raf = null;
        let stopAt = 0;
        let particles = [];
        let triggered = new Set();

        const stop = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = null;
            canvas?.remove();
            canvas = null;
            particles = [];
        };

        const start = () => {
            stop();
            canvas = h("canvas", { class: "omniyap-party", "aria-hidden": "true" });
            const root = document.body || document.documentElement;
            root.appendChild(canvas);
            const ratio = window.devicePixelRatio || 1;
            canvas.width = innerWidth * ratio;
            canvas.height = innerHeight * ratio;
            canvas.style.width = `${innerWidth}px`;
            canvas.style.height = `${innerHeight}px`;
            const context = canvas.getContext("2d");
            if (!context) return stop();
            context.scale(ratio, ratio);
            const count = Math.max(30, Math.min(260, Number(settings.store.count) || 110));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * innerWidth,
                y: -20 - Math.random() * innerHeight * 0.5,
                vx: (Math.random() - 0.5) * 1.6,
                vy: 1.4 + Math.random() * 2.8,
                size: 3 + Math.random() * 6,
                spin: (Math.random() - 0.5) * 0.25,
                angle: Math.random() * Math.PI,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            }));
            stopAt = performance.now() + Math.max(3, Number(settings.store.duration) || 12) * 1000;

            const frame = () => {
                if (!canvas || performance.now() > stopAt) return stop();
                context.clearRect(0, 0, innerWidth, innerHeight);
                for (const particle of particles) {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.angle += particle.spin;
                    if (particle.y > innerHeight + 20) {
                        particle.y = -12;
                        particle.x = Math.random() * innerWidth;
                    }
                    context.save();
                    context.translate(particle.x, particle.y);
                    context.rotate(particle.angle);
                    context.globalAlpha = 0.9;
                    context.fillStyle = particle.color;
                    context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
                    context.restore();
                }
                raf = requestAnimationFrame(frame);
            };
            raf = requestAnimationFrame(frame);
        };

        const onKey = (event) => {
            if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "p") return;
            event.preventDefault();
            start();
        };

        ctx.on("store:change", (state, previous) => {
            if (!settings.store.triggerOnMention) return;
            const active = state.activeChannelId;
            const list = state.messages?.[active] || [];
            const oldList = previous.messages?.[active] || [];
            if (list === oldList || list.length <= oldList.length) return;
            for (const message of list.slice(oldList.length)) {
                const id = message?.id;
                if (!id || triggered.has(id)) continue;
                triggered.add(id);
                const mentions = message?.mentions || message?.mentioned_users || [];
                const text = String(message.content ?? message.text ?? "");
                if (Array.isArray(mentions) && mentions.includes(state.userId)) start();
                else if (text.includes(`@${store.username(state.userId)}`)) start();
            }
            if (triggered.size > 500) triggered = new Set([...triggered].slice(-200));
        });

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(ui.registerTool({
            id: "party-mode",
            label: "Party mode",
            icon: "✦",
            description: "Confetti, on demand.",
            onClick: start,
        }));
        ctx.css(`.omniyap-party{position:fixed;inset:0;z-index:2147483000;pointer-events:none}`);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            stop();
        });
    },
});
