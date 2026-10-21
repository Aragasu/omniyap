import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Output gain for voice and media (100% = untouched).",
        default: 200,
        min: 100,
        max: 500,
        step: 10,
    },
});

export default definePlugin({
    name: "VolumeBooster",
    description: "Boosts call and media volume above 100% using WebAudio.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "media"],
    settings,

    start(ctx) {
        let audioContext = null;
        const nodes = new WeakMap();
        const boosted = new Set();

        const context = () => {
            if (!audioContext) {
                const Ctor = window.AudioContext || window.webkitAudioContext;
                if (!Ctor) return null;
                audioContext = new Ctor();
            }
            if (audioContext.state === "suspended") audioContext.resume().catch(() => undefined);
            return audioContext;
        };

        const boost = (element) => {
            if (!(element instanceof HTMLMediaElement) || nodes.has(element)) return;
            try {
                const ctxAudio = context();
                if (!ctxAudio) return;
                const source = ctxAudio.createMediaElementSource(element);
                const gain = ctxAudio.createGain();
                gain.gain.value = Math.max(1, Number(settings.store.volume) / 100);
                source.connect(gain).connect(ctxAudio.destination);
                nodes.set(element, { source, gain });
                boosted.add(element);
            } catch (err) {
                ctx.log.debug("could not boost media element", err);
            }
        };

        const scan = () => {
            document.querySelectorAll("audio, video").forEach(boost);
        };

        ctx.watch("audio, video", boost);
        ctx.onMutate(scan);
        scan();

        ctx.cleanup(settings.onChange((key, value) => {
            if (key !== "volume") return;
            for (const element of boosted) {
                const node = nodes.get(element);
                if (node) node.gain.gain.value = Math.max(1, Number(value) / 100);
            }
        }));

        ctx.cleanup(() => {
            for (const element of boosted) {
                try {
                    nodes.get(element)?.source.disconnect();
                    nodes.get(element)?.gain.disconnect();
                } catch {
                    /* ignore */
                }
            }
            boosted.clear();
            audioContext?.close?.().catch?.(() => undefined);
            audioContext = null;
        });
    },
});
