import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { playMelody } from "./_shared.js";
import { escapeRegex } from "../core/util.js";

const settings = definePluginSettings({
    volume: { type: OptionType.SLIDER, description: "Chime volume (percent).", default: 18, min: 2, max: 80, step: 1 },
    onlyWhileUnfocused: { type: OptionType.BOOLEAN, description: "Stay quiet while the window is focused.", default: true },
    cooldown: { type: OptionType.SLIDER, description: "Minimum seconds between chimes.", default: 6, min: 1, max: 60, step: 1 },
});

export default definePlugin({
    name: "MentionSound",
    description: "Plays a short two-note chime when a new message mentions you, throttled so a burst of pings is one sound.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications"],
    settings,

    start(ctx) {
        let seen = new Set();
        let last = 0;

        const mentioned = (message) => {
            const state = store.getState();
            const me = state?.userId;
            const mentions = message?.mentions || message?.mentioned_users || [];
            if (Array.isArray(mentions) && me && mentions.includes(me)) return true;
            const name = state?.profile?.username || state?.username;
            const text = String(message?.content ?? message?.text ?? "");
            return !!name && new RegExp(`@${escapeRegex(name)}\\b`, "i").test(text);
        };

        ctx.on("store:change", (state, previous) => {
            const channelId = state?.activeChannelId;
            const list = state?.messages?.[channelId] || [];
            const old = previous?.messages?.[channelId];
            if (!Array.isArray(list) || !Array.isArray(old) || list.length <= old.length) return;
            for (const message of list.slice(old.length)) {
                const id = message?.id ?? message?.message_id;
                if (!id || seen.has(id)) continue;
                seen.add(id);
                if (!mentioned(message)) continue;
                if (settings.store.onlyWhileUnfocused && document.hasFocus()) continue;
                const now = Date.now();
                if (now - last < Math.max(1, Number(settings.store.cooldown) || 6) * 1000) continue;
                last = now;
                const volume = Math.max(0.02, Math.min(0.8, (Number(settings.store.volume) || 18) / 100));
                playMelody([[880, 0], [1174.66, 0.12]], { volume, duration: 0.14 });
            }
            if (seen.size > 800) seen = new Set([...seen].slice(-300));
        });
    },
});
