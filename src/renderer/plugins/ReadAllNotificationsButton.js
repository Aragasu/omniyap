import { definePlugin, store, dom } from "../core/api.js";
import { h } from "./_shared.js";
import ui from "../ui/settings.js";

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Adds a button that marks every unread channel as read.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const markAll = async () => {
            const live = store.live();
            if (!live || typeof live.markRead !== "function") {
                dom.toast("Yapper's markRead action was not found", { type: "error" });
                return;
            }
            const state = store.getState();
            const channels = Object.values(state?.channels || {});
            let count = 0;
            for (const channel of channels) {
                if (!channel?.id) continue;
                const unread = channel.unread_count ?? channel.unread ?? channel.mentions ?? 0;
                if (!unread) continue;
                try {
                    await live.markRead(channel.id);
                    count++;
                } catch (err) {
                    ctx.log.debug("markRead failed", channel.id, err);
                }
            }
            dom.toast(count ? `Marked ${count} channel${count === 1 ? "" : "s"} as read` : "Nothing unread", {
                type: count ? "success" : "info",
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "read-all",
            label: "Mark all as read",
            icon: "✓",
            description: "Clears every unread channel and mention counter.",
            onClick: () => void markAll(),
        }));
    },
});
