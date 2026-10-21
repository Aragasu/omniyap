import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const ids = (list) => new Set((list || []).map((member) => member.userId || member.user_id || member.id));

function changes(previousList, nextList) {
    const before = ids(previousList);
    const after = ids(nextList);
    return {
        joined: [...after].filter((id) => !before.has(id)),
        left: [...before].filter((id) => !after.has(id)),
    };
}

const settings = definePluginSettings({
    volume: { type: OptionType.SLIDER, description: "Volume of the voice.", default: 1, min: 0, max: 1, step: 0.05 },
    rate: { type: OptionType.SLIDER, description: "Speaking speed.", default: 1, min: 0.5, max: 2, step: 0.1 },
    joinText: { type: OptionType.STRING, description: "Text when someone joins ({{USER}} is the name).", default: "{{USER}} joined" },
    leaveText: { type: OptionType.STRING, description: "Text when someone leaves.", default: "{{USER}} left" },
    you: { type: OptionType.BOOLEAN, description: "Also announce yourself.", default: false },
});

export default definePlugin({
    name: "VcNarrator",
    description: "Uses your system voice to announce who joins or leaves the voice channel you are in.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "accessibility"],
    settings,

    start(ctx) {
        if (!("speechSynthesis" in window)) {
            ctx.log.warn("speech synthesis is not available");
            return;
        }

        const say = (text) => {
            if (!text) return;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = Math.max(0, Math.min(1, Number(settings.store.volume)));
            utterance.rate = Math.max(0.5, Math.min(2, Number(settings.store.rate)));
            speechSynthesis.speak(utterance);
        };

        ctx.on("store:change", (state, previous) => {
            if (state.voiceMembers === previous.voiceMembers) return;
            const channelId = state.voice?.channelId || state.voiceChannelId;
            const previousChannel = previous.voice?.channelId || previous.voiceChannelId;
            if (!channelId || channelId !== previousChannel) return;

            const { joined, left } = changes(previous.voiceMembers?.[channelId], state.voiceMembers?.[channelId]);
            const me = state.userId;
            for (const id of joined) {
                if (settings.store.you || id !== me) say(String(settings.store.joinText).replace(/\{\{USER\}\}/g, store.displayName(id)));
            }
            for (const id of left) {
                if (settings.store.you || id !== me) say(String(settings.store.leaveText).replace(/\{\{USER\}\}/g, store.displayName(id)));
            }
        });

        ctx.cleanup(() => {
            try {
                speechSynthesis.cancel();
            } catch {
                /* no speech */
            }
        });
    },
});
