import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    defaultOn: { type: OptionType.BOOLEAN, description: "Start with the unread-only view enabled.", default: false },
});

export default definePlugin({
    name: "UnreadOnly",
    description: "A sidebar toggle that hides channels you have already read, leaving only the ones that need attention.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "appearance"],
    settings,

    start(ctx) {
        let active = !!settings.store.defaultOn;
        let button = null;

        const apply = () => {
            document.documentElement.classList.toggle("omniyap-unread-only", active);
            if (button) {
                button.classList.toggle("on", active);
                button.title = active ? "Show all channels" : "Show only unread channels";
                button.setAttribute("aria-pressed", String(active));
            }
        };

        const sync = () => {
            const head = document.querySelector(".sidebar-head.server-head");
            if (!head) return;
            if (!button || !button.isConnected) {
                button = h("button", {
                    class: "icon-btn omniyap-unread-toggle",
                    type: "button",
                    title: "Show only unread channels",
                    "aria-label": "Show only unread channels",
                    "aria-pressed": String(active),
                    onclick: (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        active = !active;
                        apply();
                        ctx.toast(active ? "Showing unread channels only" : "Showing all channels", { duration: 1300 });
                    },
                }, "●");
                head.appendChild(button);
            }
            apply();
        };

        ctx.watch(".sidebar-head.server-head", sync);
        ctx.onMutate(sync);
        ctx.cleanup(settings.onChange(sync));
        ctx.cleanup(() => {
            document.documentElement.classList.remove("omniyap-unread-only");
            button?.remove();
        });
        ctx.on("store:change", (state, previous) => {
            if (active && state.unread !== previous.unread) apply();
        });
        ctx.css(`
            .omniyap-unread-only .sidebar .channel-row:not(.unread){display:none!important}
            .omniyap-unread-toggle{font-size:9px;color:#7b7e8b;width:22px;height:22px;margin-left:auto}
            .omniyap-unread-toggle.on{color:#c48bff;background:rgba(139,57,253,.18);box-shadow:0 0 0 1px rgba(139,57,253,.4)}
        `);
        sync();
    },
});
