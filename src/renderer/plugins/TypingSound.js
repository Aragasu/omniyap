import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { playTone } from "./_shared.js";

const settings = definePluginSettings({
    volume: { type: OptionType.SLIDER, description: "Keypress volume.", default: 12, min: 0, max: 60, step: 2 },
    tone: {
        type: OptionType.SELECT,
        description: "Key sound.",
        options: [
            { label: "Soft tick", value: "tick" },
            { label: "Typewriter", value: "type" },
            { label: "Water drop", value: "drop" },
        ],
        default: "tick",
    },
    onlyComposer: { type: OptionType.BOOLEAN, description: "Only play while typing in the message box.", default: true },
    ignoreSpace: { type: OptionType.BOOLEAN, description: "Stay quiet for spaces and backspace.", default: false },
});

const TONES = { tick: [1200, 0.03], type: [180, 0.05], drop: [880, 0.06] };

export default definePlugin({
    name: "TypingSound",
    description: "Plays a quiet, synthesised key click while you type — no sound files or downloads.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "fun", "accessibility"],
    settings,

    start(ctx) {
        let last = 0;

        const onKey = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (settings.store.ignoreSpace && [" ", "Backspace"].includes(event.key)) return;
            if (event.key.length !== 1 && event.key !== "Backspace") return;
            if (settings.store.onlyComposer && !(event.target instanceof Element && event.target.closest("textarea, input, [contenteditable]"))) return;
            const now = performance.now();
            if (now - last < 32) return;
            last = now;
            const [frequency, duration] = TONES[settings.store.tone] || TONES.tick;
            playTone(frequency, duration, { volume: (Number(settings.store.volume) || 12) / 100 * 0.08, type: "square" });
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
