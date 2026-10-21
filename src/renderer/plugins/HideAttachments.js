import { definePlugin, definePluginSettings, OptionType, store, dom } from "../core/api.js";
import { h, localJson } from "./_shared.js";

const hidden = localJson("hidden-attachments", []);

const settings = definePluginSettings({
    showPlaceholder: {
        type: OptionType.BOOLEAN,
        description: "Show a compact placeholder instead of the attachments.",
        default: true,
    },
});

export default definePlugin({
    name: "HideAttachments",
    description: "Hide media in a channel with one click (per channel, remembered).",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        const apply = () => {
            const list = hidden.read();
            document.querySelectorAll(".msg[data-message-id]").forEach((row) => {
                const channelId = store.activeChannelId();
                const hide = list.includes(channelId);
                row.classList.toggle("omniyap-hide-attachments", hide);
                row.querySelectorAll(".omniyap-hidden-note").forEach((note) => note.remove());
                if (hide && settings.store.showPlaceholder) {
                    const media = row.querySelector(".msg-image, .msg-body > img, .msg-body > video");
                    if (media && !row.querySelector(".omniyap-hidden-note")) {
                        media.after(h("span", { class: "omniyap-hidden-note" }, "attachment hidden"));
                    }
                }
            });
            const button = document.querySelector(".omniyap-hide-media-btn");
            if (button) {
                const on = list.includes(store.activeChannelId());
                button.classList.toggle("on", on);
                button.title = on ? "Show attachments in this channel" : "Hide attachments in this channel";
            }
        };

        const toggle = () => {
            const channelId = store.activeChannelId();
            if (!channelId) return;
            const list = hidden.read();
            const next = list.includes(channelId) ? list.filter((id) => id !== channelId) : [...list, channelId];
            hidden.write(next);
            apply();
            dom.toast(next.includes(channelId) ? "Attachments hidden here" : "Attachments shown");
        };

        const addButton = () => {
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head || head.querySelector(".omniyap-hide-media-btn")) return;
            head.appendChild(h("button", {
                class: "icon-btn omniyap-hide-media-btn",
                title: "Hide attachments in this channel",
                "aria-label": "Toggle attachments",
                onclick: toggle,
            }, "◫"));
        };

        ctx.watch("header.main-head", addButton);
        ctx.onMutate(apply);
        ctx.on("store:change", apply);
        apply();

        ctx.css(`
            .msg.omniyap-hide-attachments .msg-image,
            .msg.omniyap-hide-attachments .msg-body > img,
            .msg.omniyap-hide-attachments .msg-body > video,
            .msg.omniyap-hide-attachments .msg-body > audio { display: none !important; }
            .omniyap-hidden-note{font:500 10.5px Inter,system-ui,sans-serif;color:#7c7f8a;background:rgba(255,255,255,.05);
                border-radius:5px;padding:1px 7px;margin-left:6px}
            .omniyap-hide-media-btn.on{color:#b57bff;border-color:rgba(139,57,253,.4)}
        `);
    },
});
