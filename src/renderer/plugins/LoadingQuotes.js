import { definePlugin, definePluginSettings, OptionType, dom } from "../core/api.js";
import { h } from "./_shared.js";

const QUOTES = [
    "Yapping is a feature, not a bug.",
    "Your messages are loading faster than your excuses.",
    "Somewhere, a thread is waiting for its last reply.",
    "Voice chat: where everyone is muted but still talking.",
    "A clean channel is a channel with no unread mentions.",
    "The best plugin is the one you forget is running.",
    "Server icons are just tiny billboards.",
    "Typing… typing… typing…",
];

const settings = definePluginSettings({
    duration: { type: OptionType.SLIDER, description: "How long the quote stays on screen, in seconds.", default: 4, min: 2, max: 10, step: 1 },
    custom: { type: OptionType.STRING, description: "Add your own quotes, one per line.", default: "", multiline: true },
});

export default definePlugin({
    name: "LoadingQuotes",
    description: "Shows a short quote while Yapper's interface is booting.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "appearance"],
    settings,

    start(ctx) {
        const custom = String(settings.store.custom || "").split("\n").map((line) => line.trim()).filter(Boolean);
        const pool = [...custom, ...QUOTES];
        const quote = pool[Math.floor(Math.random() * pool.length)];
        const el = h("div", { class: "omniyap-loading-quote", role: "status" },
            h("span", { class: "mark" }, "“"),
            h("span", {}, quote),
            h("span", { class: "mark" }, "”"),
        );

        ctx.css(`
            .omniyap-loading-quote{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:2147483200;
                max-width:min(620px,86vw);padding:9px 16px;border-radius:999px;background:rgba(24,24,34,.92);
                border:1px solid rgba(139,57,253,.28);color:#c9cbd4;font:italic 500 12.5px/1.4 Inter,system-ui,sans-serif;
                box-shadow:0 8px 30px rgba(0,0,0,.45);pointer-events:none;animation:omniyap-quote-in .35s ease}
            .omniyap-loading-quote .mark{color:#b57bff;font:700 15px Georgia,serif;margin:0 3px}
            @keyframes omniyap-quote-in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
        `);

        const remove = () => {
            el.classList.add("out");
            setTimeout(() => el.remove(), 250);
        };

        dom.waitFor(".server-rail, .sidebar, .chat, main", 6000).then((shell) => {
            if (!shell) return;
            (document.body || document.documentElement).appendChild(el);
            ctx.timeout(remove, Math.max(2, Math.min(10, Number(settings.store.duration) || 4)) * 1000);
        });

        ctx.cleanup(() => el.remove());
    },
});
