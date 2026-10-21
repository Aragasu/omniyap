import { definePlugin, messages, store } from "../core/api.js";
import { addMessageAction } from "./_shared.js";
import { openModal } from "../ui/modal.js";

export default definePlugin({
    name: "ViewRaw",
    description: "Adds an action to inspect the raw message JSON Yapper has loaded.",
    authors: [{ name: "OmniYap" }],
    tags: ["developer", "utility"],

    start(ctx) {
        const decorate = ({ el, message, id }) => {
            if (!message || el.querySelector('[data-omniyap-action="Raw"]')) return;
            addMessageAction(el, {
                label: "Raw",
                title: "View raw message",
                html: "{}",
                onClick: () => {
                    const payload = {
                        id,
                        channelId: store.activeChannelId(),
                        message,
                    };
                    openModal({
                        title: "Raw message",
                        subtitle: id,
                        width: 720,
                        body: `<pre style="margin:0;white-space:pre-wrap;font:12px ui-monospace,monospace;color:#c9cbd4">${JSON.stringify(payload, null, 2)
                            .replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
                        actions: [{
                            label: "Copy JSON",
                            primary: true,
                            onClick: () => navigator.clipboard.writeText(JSON.stringify(payload, null, 2)),
                        }],
                    });
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Raw"]{font:600 10px ui-monospace,monospace;width:26px;height:26px;padding:0}`);
    },
});
