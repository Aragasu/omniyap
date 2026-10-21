import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    channelNavigation: {
        type: OptionType.BOOLEAN,
        description: "Alt+↑/↓ switches channels inside the open server.",
        default: true,
    },
    toggleMute: {
        type: OptionType.BOOLEAN,
        description: "Ctrl+Shift+M toggles mute.",
        default: true,
    },
    toggleDeafen: {
        type: OptionType.BOOLEAN,
        description: "Ctrl+Shift+D toggles deafen.",
        default: true,
    },
});

function channelsOfOpenServer() {
    const state = store.getState();
    const active = store.activeChannel();
    if (!state?.channels || !active?.server_id) return [];
    return Object.values(state.channels)
        .filter((channel) => channel.server_id === active.server_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function clickControl(label) {
    const button = document.querySelector(`button[aria-label="${label}"], button[title="${label}"]`);
    if (button instanceof HTMLElement) {
        button.click();
        return true;
    }
    return false;
}

export default definePlugin({
    name: "WebKeybinds",
    description: "Alt+↑/↓ channel navigation and Ctrl+Shift+M/D mute and deafen.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "voice", "utility"],
    settings,

    start(ctx) {
        const onKey = (event) => {
            const inField = event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]");
            const mod = event.ctrlKey || event.metaKey;

            if (mod && event.shiftKey && event.key.toLowerCase() === "m" && settings.store.toggleMute) {
                if (clickControl("Mute") || clickControl("Unmute")) event.preventDefault();
                return;
            }
            if (mod && event.shiftKey && event.key.toLowerCase() === "d" && settings.store.toggleDeafen) {
                if (clickControl("Deafen") || clickControl("Undeafen")) event.preventDefault();
                return;
            }
            if (inField || !settings.store.channelNavigation) return;
            if (!event.altKey || event.shiftKey) return;
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

            const list = channelsOfOpenServer();
            if (list.length < 2) return;
            const index = list.findIndex((channel) => channel.id === store.activeChannelId());
            if (index < 0) return;
            const next = list[(index + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
            if (!next) return;
            event.preventDefault();
            store.setState({ activeChannelId: next.id });
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
