import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    showChannel: { type: OptionType.BOOLEAN, description: "Include the voice channel name.", default: true },
    showWhenNotInVoice: { type: OptionType.BOOLEAN, description: "Show the badge even if you are not in that call.", default: true },
});

function voiceIndex() {
    const state = store.getState();
    const index = new Map();
    for (const [channelId, members] of Object.entries(state?.voiceMembers || {})) {
        if (!Array.isArray(members)) continue;
        for (const member of members) {
            const id = typeof member === "string" ? member : member?.userId || member?.user_id || member?.id;
            if (id) index.set(id, channelId);
        }
    }
    return index;
}

export default definePlugin({
    name: "UserVoiceShow",
    description: "Adds a small voice badge to messages from people who are currently in a call.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "chat", "utility"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const userId = message?.author_id || message?.user_id;
            const head = el.querySelector(".msg-head");
            if (!head) return;
            const existing = head.querySelector(".omniyap-voice-badge");
            const channelId = userId ? voiceIndex().get(userId) : null;
            if (!channelId) {
                existing?.remove();
                return;
            }
            if (!settings.store.showWhenNotInVoice) {
                const myVoice = store.getState()?.voice?.channelId || store.getState()?.voiceChannelId;
                if (myVoice !== channelId) {
                    existing?.remove();
                    return;
                }
            }
            if (existing) return;
            const name = settings.store.showChannel ? store.channelName(channelId) : "";
            head.appendChild(h("span", {
                class: "omniyap-voice-badge",
                title: `In voice${name ? `: ${name}` : ""}`,
            }, `🔊${name ? ` ${name}` : ""}`));
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.on("store:change", (state, previous) => {
            if (state.voiceMembers !== previous.voiceMembers) messages.refresh();
        });
        ctx.cleanup(settings.onChange(() => messages.refresh()));
        ctx.css(`
            .omniyap-voice-badge{margin-left:6px;padding:0 6px;border-radius:999px;border:1px solid rgba(110,222,159,.25);
                background:rgba(48,164,108,.11);color:#8fe3b4;font:500 9.5px Inter,system-ui,sans-serif;
                vertical-align:1px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        `);
    },
});
