import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    colour: { type: OptionType.STRING, description: "Ripple colour.", default: "#c48bff" },
    size: { type: OptionType.SLIDER, description: "Ripple size in pixels.", default: 64, min: 24, max: 140, step: 4 },
});

export default definePlugin({
    name: "ClickRipple",
    description: "A short ripple appears wherever you click, a small visual confirmation that also makes screen recordings easier to follow.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "fun"],
    settings,

    start(ctx) {
        const onDown = (event) => {
            if (event.button !== 0) return;
            const size = Math.max(24, Number(settings.store.size) || 64);
            const ripple = document.createElement("span");
            ripple.className = "omniyap-click-ripple";
            ripple.style.left = `${event.clientX}px`;
            ripple.style.top = `${event.clientY}px`;
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.borderColor = String(settings.store.colour || "#c48bff");
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 520);
        };
        document.addEventListener("mousedown", onDown, true);
        ctx.cleanup(() => {
            document.removeEventListener("mousedown", onDown, true);
            document.querySelectorAll(".omniyap-click-ripple").forEach((node) => node.remove());
        });
        ctx.css(`
            .omniyap-click-ripple{position:fixed;z-index:2147483200;border:2px solid #c48bff;border-radius:50%;
                transform:translate(-50%,-50%);pointer-events:none;opacity:.8;
                animation:omniyap-ripple-out .5s ease-out forwards}
            @keyframes omniyap-ripple-out{from{transform:translate(-50%,-50%) scale(.25);opacity:.85}
                to{transform:translate(-50%,-50%) scale(1);opacity:0}}
        `);
    },
});
