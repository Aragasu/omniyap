import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    step: { type: OptionType.SLIDER, description: "Pixels scrolled per j/k press.", default: 90, min: 40, max: 240, step: 10 },
    halfPage: { type: OptionType.BOOLEAN, description: "Use d/u for half-page jumps.", default: true },
});

export default definePlugin({
    name: "VimNavigation",
    description: "Scrolls the message list with j/k, jumps to the top or bottom with gg/G, and optionally pages with d/u.",
    authors: [{ name: "OmniYap" }],
    tags: ["keyboard", "input"],
    settings,

    start(ctx) {
        let pendingG = 0;

        const scroller = () => document.querySelector(".messages, .msg-list, .chat-scroll");

        const onKey = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
            if (event.key !== "g" && event.key !== "G") pendingG = 0;

            const list = scroller();
            if (!list) return;
            const step = Math.max(40, Math.min(240, Number(settings.store.step) || 90));
            const half = Math.max(120, list.clientHeight * 0.5);

            switch (event.key) {
                case "j":
                    list.scrollBy({ top: step, behavior: "smooth" });
                    break;
                case "k":
                    list.scrollBy({ top: -step, behavior: "smooth" });
                    break;
                case "d":
                    if (!settings.store.halfPage) return;
                    list.scrollBy({ top: half, behavior: "smooth" });
                    break;
                case "u":
                    if (!settings.store.halfPage) return;
                    list.scrollBy({ top: -half, behavior: "smooth" });
                    break;
                case "G":
                    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
                    break;
                case "g": {
                    const now = Date.now();
                    if (now - pendingG < 600) {
                        list.scrollTo({ top: 0, behavior: "smooth" });
                        pendingG = 0;
                    } else {
                        pendingG = now;
                    }
                    return;
                }
                default:
                    return;
            }
            event.preventDefault();
        };

        document.addEventListener("keydown", onKey);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey));
    },
});
