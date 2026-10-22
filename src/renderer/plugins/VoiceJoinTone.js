import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { playMelody } from "./_shared.js";

const settings = definePluginSettings({
    join: { type: OptionType.BOOLEAN, description: "Play a rising tone when you join a call.", default: true },
    leave: { type: OptionType.BOOLEAN, description: "Play a falling tone when you leave.", default: true },
    volume: { type: OptionType.SLIDER, description: "Volume.", default: 0.1, min: 0, max: 0.5, step: 0.02 },
});

const channelOf = (state) => state?.voice?.channelId || state?.voiceChannelId || null;

export default definePlugin({
    name: "VoiceJoinTone",
    description: "A quiet synthesised chime when you join or leave a voice call, so you know the connection worked.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "utility"],
    settings,

    start(ctx) {
        let current = null;
        ctx.on("store:change", (state, previous) => {
            const next = channelOf(state);
            const before = channelOf(previous);
            if (next === before) return;
            const volume = Math.max(0, Math.min(0.5, Number(settings.store.volume) || 0.1));
            if (next && settings.store.join) {
                playMelody([[523.25, 0], [659.25, 0.09], [783.99, 0.18]], { volume, type: "sine", duration: 0.2 });
            } else if (!next && settings.store.leave) {
                playMelody([[783.99, 0], [659.25, 0.09], [523.25, 0.18]], { volume, type: "sine", duration: 0.2 });
            }
            current = next;
        });
        current = channelOf(store.getState());
    },
});
