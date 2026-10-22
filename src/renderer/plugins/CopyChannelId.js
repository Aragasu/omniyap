import { definePlugin, store } from "../core/api.js";
import { headerButton } from "./_shared.js";

export default definePlugin({
    name: "CopyChannelId",
    description: "Adds a header button that copies the id of the channel you are looking at, handy for bug reports and bots.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "developer"],

    start(ctx) {
        const mount = () => {
            headerButton({
                className: "omniyap-copy-channel",
                title: "Copy channel id",
                text: "#",
                onClick: () => {
                    const channel = store.activeChannel?.();
                    const id = channel?.id ?? store.activeChannelId?.();
                    if (!id) return ctx.toast("No channel is open");
                    ctx.copy(String(id), `Copied channel id ${id}`);
                },
            });
        };

        ctx.cleanup(ctx.watch("header.main-head", mount));
        ctx.cleanup(() => document.querySelector(".omniyap-copy-channel")?.remove());
        ctx.css(`.omniyap-copy-channel{font:700 13px ui-monospace,monospace;opacity:.75}.omniyap-copy-channel:hover{opacity:1}`);
    },
});
