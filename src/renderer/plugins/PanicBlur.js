import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    amount: { type: OptionType.SLIDER, description: "Blur strength in pixels.", default: 18, min: 6, max: 40, step: 2 },
});

export default definePlugin({
    name: "PanicBlur",
    description: "Ctrl+Alt+X instantly blurs the entire window for privacy. Click the overlay to bring everything back.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "utility"],
    settings,

    start(ctx) {
        let overlay = null;

        const restore = () => {
            overlay?.remove();
            overlay = null;
            document.documentElement.classList.remove("omniyap-panic");
        };

        const trigger = () => {
            if (overlay) return restore();
            document.documentElement.style.setProperty("--omniyap-panic-blur", `${Math.max(6, Number(settings.store.amount) || 18)}px`);
            document.documentElement.classList.add("omniyap-panic");
            overlay = h("div", {
                class: "omniyap-panic-overlay",
                role: "button",
                tabindex: "0",
                title: "Click to restore",
                onclick: restore,
                onkeydown: (event) => {
                    if (event.key === "Enter" || event.key === " ") restore();
                },
            },
                h("div", { class: "omniyap-panic-card" },
                    h("b", {}, "Screen hidden"),
                    h("span", {}, "Click anywhere to restore · Ctrl+Alt+X"),
                ),
            );
            document.body.appendChild(overlay);
            overlay.focus();
        };

        const onKey = (event) => {
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "x") {
                event.preventDefault();
                event.stopPropagation();
                trigger();
            } else if (event.key === "Escape" && overlay) {
                restore();
            }
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            restore();
            document.documentElement.style.removeProperty("--omniyap-panic-blur");
        });
        ctx.css(`
            .omniyap-panic .app{filter:blur(var(--omniyap-panic-blur,18px))!important}
            .omniyap-panic-overlay{position:fixed;inset:0;z-index:2147483200;background:rgba(8,8,12,.55);
                display:flex;align-items:center;justify-content:center;cursor:pointer;outline:none}
            .omniyap-panic-card{display:flex;flex-direction:column;gap:5px;align-items:center;background:rgba(20,20,28,.92);
                border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:18px 26px;color:#ececf1;
                font:600 14px Inter,system-ui,sans-serif;box-shadow:0 16px 50px rgba(0,0,0,.5)}
            .omniyap-panic-card span{font:400 11.5px Inter,system-ui,sans-serif;color:#9496a2}
        `);
    },
});
