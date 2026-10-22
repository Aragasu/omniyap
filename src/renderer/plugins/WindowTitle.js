import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    template: { type: OptionType.STRING, description: "Title template. {channel}, {server} and {unread} are replaced.", default: "{channel} · Yapper" },
    showUnread: { type: OptionType.BOOLEAN, description: "Prefix the title with the unread count when there is one.", default: true },
});

function unreadCount() {
    const badges = document.querySelectorAll(".unread-badge, .mention-badge, .channel-unread");
    let total = 0;
    for (const badge of badges) {
        const value = Number((badge.textContent || "").trim());
        if (Number.isFinite(value)) total += value;
    }
    return total;
}

export default definePlugin({
    name: "WindowTitle",
    description: "Puts the active channel, its server and your unread count into the window title.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "notifications"],
    settings,

    start(ctx) {
        const original = document.title;

        const update = () => {
            const channel = store.activeChannel?.();
            const name = channel?.name || channel?.title || "Direct messages";
            const server = channel?.server_id ? store.server?.(channel.server_id)?.name || "" : "";
            const unread = unreadCount();
            let title = String(settings.store.template || "{channel} · Yapper")
                .replace(/\{channel\}/g, name)
                .replace(/\{server\}/g, server)
                .replace(/\{unread\}/g, String(unread))
                .trim();
            if (settings.store.showUnread && unread > 0 && !settings.store.template.includes("{unread}")) {
                title = `(${unread > 99 ? "99+" : unread}) ${title}`;
            }
            if (document.title !== title) document.title = title;
        };

        ctx.interval(update, 4000);
        ctx.on("store:change", update);
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => {
            document.title = original;
        });
        update();
    },
});
