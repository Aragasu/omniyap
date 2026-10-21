import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";

const EFFECTS = ["none", "rainbow", "aurora", "neon", "pulse"];

const settings = definePluginSettings({
    effect: {
        type: OptionType.SELECT,
        description: "Effect applied to your own name.",
        options: [
            { label: "None", value: "none" },
            { label: "Rainbow gradient", value: "rainbow" },
            { label: "Aurora", value: "aurora" },
            { label: "Neon glow", value: "neon" },
            { label: "Pulse", value: "pulse" },
        ],
        default: "aurora",
    },
    speed: { type: OptionType.SLIDER, description: "Animation speed.", default: 50, min: 10, max: 100, step: 10 },
    everyone: { type: OptionType.BOOLEAN, description: "Apply the effect to every name, not only yours.", default: false },
});

export default definePlugin({
    name: "NameEffects",
    description: "Adds an animated effect to your name (rainbow, aurora, neon or pulse). Client-side only.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "fun", "customisation"],
    settings,

    start(ctx) {
        const effectFor = () => (EFFECTS.includes(settings.store.effect) ? settings.store.effect : "none");

        const decorate = ({ el, message }) => {
            const author = el.querySelector(":scope > .msg-body > .msg-head > .msg-author");
            if (!author) return;
            const mine = !!message?.author_id && message.author_id === store.myId();
            const effect = settings.store.everyone || mine ? effectFor() : "none";
            for (const name of EFFECTS) author.classList.toggle(`omniyap-name-${name}`, name === effect && effect !== "none");
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => {
            messages.refresh();
            applySpeed();
        }));

        const applySpeed = () => {
            const seconds = (120 - Math.max(10, Math.min(100, Number(settings.store.speed) || 50))) / 40 + 2;
            document.documentElement.style.setProperty("--omniyap-name-speed", `${seconds.toFixed(2)}s`);
        };

        ctx.css(`
            .omniyap-name-rainbow,.omniyap-name-aurora,.omniyap-name-neon,.omniyap-name-pulse{
                background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent!important;
                animation-duration:var(--omniyap-name-speed,4s);animation-iteration-count:infinite;animation-timing-function:linear;
            }
            .omniyap-name-rainbow{background-image:linear-gradient(90deg,#ff5f6d,#ffc371,#47e5bc,#5b8cff,#c471ed,#ff5f6d);animation-name:omniyap-name-slide}
            .omniyap-name-aurora{background-image:linear-gradient(90deg,#8b39fd,#5ee7ff,#c084fc,#8b39fd);animation-name:omniyap-name-slide}
            .omniyap-name-neon{background-image:linear-gradient(90deg,#c4a1ff,#8b39fd,#e0c3ff,#8b39fd);animation-name:omniyap-name-slide;
                filter:drop-shadow(0 0 6px rgba(139,57,253,.75))}
            .omniyap-name-pulse{background-image:linear-gradient(90deg,#8b39fd,#d9c2ff,#8b39fd);animation-name:omniyap-name-pulse}
            @keyframes omniyap-name-slide{to{background-position:220% center}}
            @keyframes omniyap-name-pulse{0%,100%{opacity:.65;background-position:0 center}50%{opacity:1;background-position:100% center}}
            @media (prefers-reduced-motion:reduce){
                .omniyap-name-rainbow,.omniyap-name-aurora,.omniyap-name-neon,.omniyap-name-pulse{animation:none}
            }
        `);
        applySpeed();
        messages.refresh();
    },
});
