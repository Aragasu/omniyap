import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    hidden: {
        type: OptionType.BOOLEAN,
        description: "Hide images, videos and link embeds in chat.",
        default: false,
    },
    videosToo: { type: OptionType.BOOLEAN, description: "Hide videos as well as images.", default: true },
    embedsToo: { type: OptionType.BOOLEAN, description: "Hide link previews as well.", default: false },
    showButton: { type: OptionType.BOOLEAN, description: "Show a toggle button in the chat header.", default: true },
});

export default definePlugin({
    name: "HideMedia",
    description: "Hides images, videos and link previews across chat with one toggle, for a calmer, text-only view.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "appearance", "utility"],
    settings,

    start(ctx) {
        const apply = () => {
            const root = document.documentElement;
            root.toggleAttribute("data-omniyap-hide-media", !!settings.store.hidden);
            root.toggleAttribute("data-omniyap-hide-video", !!settings.store.videosToo);
            root.toggleAttribute("data-omniyap-hide-embeds", !!settings.store.embedsToo);
            const button = document.querySelector(".omniyap-hide-media-toggle");
            if (button) {
                button.classList.toggle("on", !!settings.store.hidden);
                button.title = settings.store.hidden ? "Show media" : "Hide media";
                button.setAttribute("aria-pressed", String(!!settings.store.hidden));
            }
        };

        const addButton = () => {
            if (!settings.store.showButton) return;
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head || head.querySelector(".omniyap-hide-media-toggle")) return;
            head.append(h("button", {
                class: "icon-btn omniyap-hide-media-toggle",
                title: "Hide media",
                "aria-label": "Toggle media",
                onclick: () => {
                    settings.store.hidden = !settings.store.hidden;
                },
            }, "◫"));
        };

        ctx.css(`
            html[data-omniyap-hide-media] .msg-image,
            html[data-omniyap-hide-media] .msg-body > img,
            html[data-omniyap-hide-media] .msg-body img.emoji{display:none!important}
            html[data-omniyap-hide-video][data-omniyap-hide-media] .msg-body > video,
            html[data-omniyap-hide-video][data-omniyap-hide-media] .msg-body > audio{display:none!important}
            html[data-omniyap-hide-embeds][data-omniyap-hide-media] .msg-embed,
            html[data-omniyap-hide-embeds][data-omniyap-hide-media] .link-embed{display:none!important}
            .omniyap-hide-media-toggle.on{color:#b57bff;border-color:rgba(139,57,253,.45)}
        `);

        ctx.watch("header.main-head", addButton);
        ctx.onMutate(apply);
        ctx.on("store:change", apply);
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            const root = document.documentElement;
            root.removeAttribute("data-omniyap-hide-media");
            root.removeAttribute("data-omniyap-hide-video");
            root.removeAttribute("data-omniyap-hide-embeds");
            document.querySelectorAll(".omniyap-hide-media-toggle").forEach((node) => node.remove());
        });

        apply();
        addButton();
    },
});
