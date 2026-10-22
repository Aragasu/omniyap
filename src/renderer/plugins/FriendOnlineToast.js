import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    toast: { type: OptionType.BOOLEAN, description: "Show an in-app toast.", default: true },
    desktop: { type: OptionType.BOOLEAN, description: "Also use a desktop notification.", default: true },
    ignoreDnd: { type: OptionType.BOOLEAN, description: "Skip friends who are in do-not-disturb.", default: false },
    quietChannels: { type: OptionType.BOOLEAN, description: "Stay quiet while you are in a voice call.", default: true },
});

const AWAY = new Set(["offline", "invisible", undefined, null, ""]);

export default definePlugin({
    name: "FriendOnlineToast",
    description: "Tells you when a friend comes online, without opening the friends list.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "social", "utility"],
    settings,

    start(ctx) {
        let previous = null;

        const inVoice = () => {
            const state = store.getState();
            return !!(state?.voice?.channelId || state?.voiceChannelId);
        };

        const announce = (userId, status) => {
            if (settings.store.ignoreDnd && status === "dnd") return;
            if (settings.store.quietChannels && inVoice()) return;
            const name = store.displayName(userId) || userId;
            if (settings.store.toast) ctx.toast(`${name} is online`, { type: "info" });
            if (settings.store.desktop && window.Notification?.permission === "granted") {
                try {
                    new Notification("Yapper", { body: `${name} is now online`, silent: false });
                } catch {
                    /* ignore */
                }
            }
        };

        ctx.on("store:change", (state) => {
            const online = state?.online;
            if (!online) return;
            if (!previous) {
                previous = { ...online };
                return;
            }
            const friends = state.friends || {};
            for (const [userId, status] of Object.entries(online)) {
                if (previous[userId] === status) continue;
                if (AWAY.has(previous[userId]) && !AWAY.has(status) && friends[userId] === "accepted") announce(userId, status);
            }
            previous = { ...online };
        });
    },
});
