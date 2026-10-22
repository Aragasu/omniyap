import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { playMelody } from "./_shared.js";

const MELODIES = {
    chime: [[784, 0], [988, 0.18], [1175, 0.36]],
    arcade: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]],
    soft: [[440, 0], [554, 0.22], [659, 0.44]],
    alert: [[880, 0], [880, 0.2], [880, 0.4]],
};

const settings = definePluginSettings({
    melody: {
        type: OptionType.SELECT,
        description: "Which ringtone to play.",
        options: Object.entries(MELODIES).map(([value]) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
        default: "chime",
    },
    volume: { type: OptionType.SLIDER, description: "Ringtone volume.", default: 45, min: 5, max: 100, step: 5 },
    repeat: { type: OptionType.SLIDER, description: "Seconds between repeats.", default: 3, min: 1, max: 10, step: 1 },
});

export default definePlugin({
    name: "SecretRingTone",
    description: "Replaces the call ring with a short synthesised melody that repeats until you answer.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "fun", "utility"],
    settings,

    start(ctx) {
        let ringing = false;
        let lastPlayed = 0;

        const isRinging = () => {
            const state = store.getState();
            const value = state?.ringing ?? state?.incomingCall ?? state?.calls;
            if (!value) return false;
            if (typeof value === "object") return Object.keys(value).length > 0;
            return !!value;
        };

        const tick = () => {
            const active = isRinging();
            if (!active) {
                ringing = false;
                return;
            }
            const now = Date.now();
            if (!ringing) ringing = true;
            if (now - lastPlayed < Math.max(1, Number(settings.store.repeat)) * 1000) return;
            lastPlayed = now;
            const melody = MELODIES[settings.store.melody] || MELODIES.chime;
            playMelody(melody, { volume: (Number(settings.store.volume) || 45) / 100 * 0.22, type: "triangle", duration: 0.2 });
        };

        ctx.interval(tick, 500);
        ctx.on("store:change", tick);
        tick();
    },
});
