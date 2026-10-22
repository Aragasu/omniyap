import { definePlugin, store } from "../core/api.js";
import { h } from "./_shared.js";

export default definePlugin({
    name: "CopyUserId",
    description: "Adds a Copy ID button to profile cards, for bug reports, bot configs and support tickets.",
    authors: [{ name: "OmniYap" }],
    tags: ["people", "utility"],

    start(ctx) {
        const sync = () => {
            const card = document.querySelector(".profile-card");
            if (!card) return;
            const userId = store.getState()?.profileCard;
            if (!userId) return;
            const quick = card.querySelector(".pc-quick");
            if (!quick || quick.querySelector(".omniyap-copy-id")) return;
            const button = h("button", {
                type: "button",
                class: "btn small secondary icon omniyap-copy-id",
                title: `Copy user ID · ${userId}`,
                "aria-label": "Copy user ID",
                onclick: (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    navigator.clipboard.writeText(userId).then(
                        () => ctx.toast("User ID copied", { type: "success", duration: 1500 }),
                        () => ctx.toast("Could not copy", { type: "error", duration: 1500 }),
                    );
                },
            }, "ID");
            quick.appendChild(button);
        };

        ctx.onMutate(sync);
        ctx.on("store:change", sync);
        ctx.cleanup(() => document.querySelectorAll(".omniyap-copy-id").forEach((node) => node.remove()));
        ctx.css(`
            .omniyap-copy-id{font:700 10px Inter,system-ui,sans-serif;min-width:34px;letter-spacing:.04em}
        `);
        sync();
    },
});
