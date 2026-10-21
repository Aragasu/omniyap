import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    threshold: {
        type: OptionType.SLIDER,
        description: "Show the button after scrolling up this many pixels.",
        default: 400,
        min: 100,
        max: 2000,
        step: 50,
    },
});

export default definePlugin({
    name: "JumpToLatest",
    description: "Shows a floating button to jump back to the newest message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let button = null;
        let scroller = null;

        const mount = (el) => {
            if (scroller === el && button?.isConnected) return;
            scroller = el;
            button?.remove();
            button = h("button", {
                class: "omniyap-jump-latest",
                title: "Jump to the latest message",
                onclick: () => {
                    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                },
            }, "↓ Latest");
            (document.body || document.documentElement).appendChild(button);
        };

        const update = () => {
            const el = document.querySelector(".messages");
            if (!el) return;
            mount(el);
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
            button?.classList.toggle("visible", distance > Number(settings.store.threshold || 400));
        };

        ctx.watch(".messages", () => {
            update();
        });
        ctx.onMutate(update);
        const onScroll = () => update();
        document.addEventListener("scroll", onScroll, true);
        ctx.interval(update, 1500);
        update();

        ctx.css(`
            .omniyap-jump-latest{position:fixed;right:24px;bottom:88px;z-index:2147482000;display:none;
                padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:#20202b;color:#d6d7de;
                font:600 11.5px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4)}
            .omniyap-jump-latest.visible{display:block}
            .omniyap-jump-latest:hover{border-color:#8b39fd;color:#fff}
        `);

        ctx.cleanup(() => {
            document.removeEventListener("scroll", onScroll, true);
            button?.remove();
        });
    },
});
