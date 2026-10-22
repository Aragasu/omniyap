import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Double-click a voice channel to join it.", default: true },
    confirm: { type: OptionType.BOOLEAN, description: "Ask before joining an empty voice channel.", default: false },
});

function isVoice(channel) {
    const kind = channel?.kind || channel?.type || channel?.channel_type;
    return kind === "voice" || kind === "vc" || !!channel?.is_voice;
}

function join(channel) {
    const live = store.live();
    const methods = ["joinVoice", "joinVoiceChannel", "connectVoice", "joinCall", "connectToVoice"];
    for (const method of methods) {
        if (typeof live?.[method] === "function") {
            try {
                live[method](channel.id);
                return true;
            } catch (err) {
                // Try the next name.
            }
        }
    }
    const row = document.querySelector(`[data-channel-id="${CSS.escape(channel.id)}"]`);
    if (row instanceof HTMLElement) {
        row.click();
        return true;
    }
    return false;
}

export default definePlugin({
    name: "VcDoubleClick",
    description: "Double-click any voice channel in the sidebar to join it.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "navigation", "utility"],
    settings,

    start(ctx) {
        const onDoubleClick = (event) => {
            if (!settings.store.enabled) return;
            const target = event.target instanceof Element ? event.target.closest("[data-channel-id]") : null;
            if (!target) return;
            const channelId = target.getAttribute("data-channel-id");
            const channel = store.channel(channelId);
            if (!channel || !isVoice(channel)) return;
            const members = store.getState()?.voiceMembers?.[channelId] || [];
            if (settings.store.confirm && !members.length) {
                const ok = window.confirm(`Join the empty voice channel "${store.channelName(channelId)}"?`);
                if (!ok) return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (join(channel)) ctx.toast(`Joining ${store.channelName(channelId)}`);
            else ctx.toast("Yapper did not expose a way to join from here.", { type: "error" });
        };

        document.addEventListener("dblclick", onDoubleClick, true);
        ctx.cleanup(() => document.removeEventListener("dblclick", onDoubleClick, true));
    },
});
