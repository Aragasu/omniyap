import { definePlugin, store } from "../core/api.js";

function unreadChannels() {
    const state = store.getState();
    if (!state?.channels) return [];
    return Object.values(state.channels)
        .filter((channel) => (channel.unread_count || channel.unread || channel.mentions || 0) > 0)
        .sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id));
}

export default definePlugin({
    name: "UnreadNavigator",
    description: "Jump between unread channels with Alt+Shift+↑/↓.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "chat"],

    start(ctx) {
        const go = (direction) => {
            const list = unreadChannels();
            if (!list.length) return ctx.toast("No unread channels");
            const activeIndex = list.findIndex((channel) => channel.id === store.activeChannelId());
            const index = activeIndex < 0
                ? (direction > 0 ? 0 : list.length - 1)
                : (activeIndex + direction + list.length) % list.length;
            const target = list[index];
            if (!target) return;
            try {
                store.setState({ activeChannelId: target.id });
                ctx.toast(`#${store.channelName(target.id)}`);
            } catch (err) {
                ctx.log.warn("could not navigate", err);
            }
        };

        const onKey = (event) => {
            if (!event.altKey || !event.shiftKey) return;
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            event.stopPropagation();
            go(event.key === "ArrowDown" ? 1 : -1);
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
