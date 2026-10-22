import { definePlugin, messages, store } from "../core/api.js";
import { h, addMessageAction, headerButton, messageUrl } from "./_shared.js";

function copy(text, label = "Link copied") {
    return navigator.clipboard.writeText(text).then(
        () => label,
        () => "Could not copy the link",
    );
}

export default definePlugin({
    name: "CopyChannelLink",
    description: "Adds header and message actions that copy a shareable link to the channel or a specific message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings: undefined,

    start(ctx) {
        const copyChannel = async () => {
            const channelId = store.activeChannelId();
            if (!channelId) return;
            const url = messageUrl("", channelId).replace(/&message=$/, "");
            const result = await copy(url, `Copied link to #${store.channelName(channelId)}`);
            ctx.toast(result, { type: result.startsWith("Could not") ? "error" : "success" });
        };

        const decorate = ({ el, id }) => {
            if (el.querySelector('[data-omniyap-action="Message link"]')) return;
            addMessageAction(el, {
                label: "Message link",
                title: "Copy a link to this message",
                html: "⧉",
                onClick: async () => {
                    const result = await copy(messageUrl(id, store.activeChannelId()));
                    ctx.toast(result, { type: result.startsWith("Could not") ? "error" : "success" });
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.watch("header.main-head", () => headerButton({
            className: "omniyap-channel-link",
            title: "Copy channel link",
            text: "🔗",
            onClick: copyChannel,
        }));
        ctx.cleanup(() => document.querySelector(".omniyap-channel-link")?.remove());
        ctx.css(`
            .omniyap-channel-link{font-size:11px;width:26px;height:26px;padding:0;filter:grayscale(.5)}
            [data-omniyap-action="Message link"]{font-size:13px;width:26px;height:26px;padding:0}
        `);
    },
});
