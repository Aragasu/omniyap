import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { playTone } from "./_shared.js";

const settings = definePluginSettings({
    volume: { type: OptionType.SLIDER, description: "Notification sound volume (100% = unchanged).", default: 55, min: 0, max: 100, step: 5 },
    muteWhenFocused: { type: OptionType.BOOLEAN, description: "Silence notification sounds while the window is focused.", default: false },
});

export default definePlugin({
    name: "NotificationVolume",
    description: "Turns notification, ping and mention sounds down independently of voice and media volume.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "media", "utility"],
    settings,

    start(ctx) {
        const OriginalAudio = window.Audio;
        const originalVolume = new WeakMap();
        const factor = () => Math.max(0, Math.min(100, Number(settings.store.volume))) / 100;

        const isNotificationSound = (element) => {
            const source = String(element?.src || "");
            return /notif|ping|mention|message|pop|ding|sound/i.test(source);
        };

        const apply = (element) => {
            if (!(element instanceof HTMLMediaElement) || !isNotificationSound(element)) return;
            if (!originalVolume.has(element)) originalVolume.set(element, element.volume);
            const base = originalVolume.get(element);
            element.volume = Math.max(0, Math.min(1, base * factor()));
        };

        class QuietAudio extends OriginalAudio {
            constructor(...args) {
                super(...args);
                const tune = () => apply(this);
                this.addEventListener("loadedmetadata", tune, { once: true });
                this.addEventListener("play", tune);
                if (this.src) tune();
            }
        }

        try {
            window.Audio = QuietAudio;
        } catch (err) {
            ctx.log.warn("could not wrap Audio", err);
        }

        const onPlay = (event) => {
            const element = event.target;
            if (!(element instanceof HTMLMediaElement)) return;
            if (settings.store.muteWhenFocused && !document.hidden && isNotificationSound(element)) {
                element.volume = 0;
                return;
            }
            apply(element);
        };

        document.addEventListener("play", onPlay, true);

        const test = () => {
            const now = Date.now();
            if (settings.store.muteWhenFocused && !document.hidden) return ctx.toast("Sounds are muted while focused.");
            // A quick two-note preview at the configured level.
            const gain = factor() * 0.12;
            playTone(740, 0.1, { volume: gain });
            playTone(988, 0.12, { volume: gain, delay: 0.11 });
        };

        const open = () => {
            test();
            ctx.toast(`Notification volume: ${settings.store.volume}%`);
        };

        ctx.cleanup(settings.onChange((key) => {
            if (key === "volume") test();
        }));
        ctx.cleanup(() => {
            document.removeEventListener("play", onPlay, true);
            if (window.Audio === QuietAudio) window.Audio = OriginalAudio;
            document.querySelectorAll("audio, video").forEach((element) => {
                if (originalVolume.has(element)) element.volume = originalVolume.get(element);
            });
        });
        ctx.plugin.preview = open;
        ctx.css(`.omniyap-notification-volume-note{display:none}`);
    },
});
