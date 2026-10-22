import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { playTone } from "./_shared.js";

const PACKS = {
    pop: { send: [[660, 0]], receive: [[520, 0]], mention: [[740, 0], [988, 0.12]] },
    chime: { send: [[784, 0], [988, 0.1]], receive: [[523, 0], [659, 0.12]], mention: [[784, 0], [1047, 0.12], [1319, 0.24]] },
    blip: { send: [[440, 0]], receive: [[330, 0]], mention: [[440, 0], [660, 0.1], [440, 0.2]] },
    soft: { send: [[392, 0]], receive: [[349, 0]], mention: [[440, 0], [554, 0.16]] },
};

const settings = definePluginSettings({
    pack: {
        type: OptionType.SELECT,
        description: "Sound palette.",
        options: Object.keys(PACKS).map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
        default: "chime",
    },
    volume: { type: OptionType.SLIDER, description: "Cue volume.", default: 22, min: 0, max: 100, step: 2 },
    onSend: { type: OptionType.BOOLEAN, description: "Play a sound when you send.", default: true },
    onReceive: { type: OptionType.BOOLEAN, description: "Play a sound for new messages in the open channel.", default: true },
    onMention: { type: OptionType.BOOLEAN, description: "Use a different sound when you are mentioned.", default: true },
});

function play(kind) {
    const pack = PACKS[settings.store.pack] || PACKS.chime;
    const notes = pack[kind] || pack.receive;
    const volume = Math.max(0, Math.min(100, Number(settings.store.volume))) / 100 * 0.2;
    for (const [frequency, delay] of notes) playTone(frequency, 0.13, { volume, type: "sine", delay });
}

export default definePlugin({
    name: "CustomSounds",
    description: "Synthesised send, receive and mention cues you can hear over music, with no sound files.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "chat", "appearance"],
    settings,

    start(ctx) {
        let previous = null;

        const onKeyDown = (event) => {
            if (!settings.store.onSend || event.key !== "Enter" || event.shiftKey) return;
            if (event.target instanceof HTMLElement && event.target.closest("textarea, input, [contenteditable]")) play("send");
        };
        const onClick = (event) => {
            if (!settings.store.onSend) return;
            if (event.target instanceof Element && event.target.closest(".send-btn, button[type='submit']")) play("send");
        };

        ctx.on("store:change", (state) => {
            const active = state.activeChannelId;
            const list = state.messages?.[active] || [];
            if (!previous) {
                previous = list;
                return;
            }
            if (list === previous || list.length <= previous.length) {
                previous = list;
                return;
            }
            if (!settings.store.onReceive) {
                previous = list;
                return;
            }
            for (const message of list.slice(previous.length)) {
                const author = message?.author_id || message?.user_id;
                if (!author || author === state.userId) continue;
                const mentions = message?.mentions || message?.mentioned_users || [];
                const text = String(message.content ?? message.text ?? "");
                const mentioned = settings.store.onMention && (
                    (Array.isArray(mentions) && mentions.includes(state.userId))
                    || text.includes(`@${store.username(state.userId)}`)
                );
                play(mentioned ? "mention" : "receive");
            }
            previous = list;
        });

        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("click", onClick, true);
        });
    },
});
