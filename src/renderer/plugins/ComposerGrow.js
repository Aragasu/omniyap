import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    max: { type: OptionType.SLIDER, description: "Maximum composer height in pixels.", default: 220, min: 80, max: 520, step: 20 },
});

export default definePlugin({
    name: "ComposerGrow",
    description: "Grows the message box as you type long messages, up to a configurable height.",
    authors: [{ name: "OmniYap" }],
    tags: ["input", "appearance"],
    settings,

    start(ctx) {
        const resize = (input) => {
            if (!(input instanceof HTMLTextAreaElement)) return;
            const max = Math.max(80, Math.min(520, Number(settings.store.max) || 220));
            input.style.height = "auto";
            const next = Math.min(max, input.scrollHeight);
            input.style.height = `${next}px`;
            input.style.overflowY = input.scrollHeight > max ? "auto" : "hidden";
        };

        const attach = (input) => {
            if (!(input instanceof HTMLTextAreaElement) || input.dataset.omniyapGrow === "1") return;
            input.dataset.omniyapGrow = "1";
            const onInput = () => resize(input);
            input.addEventListener("input", onInput);
            resize(input);
            ctx.cleanup(() => {
                input.removeEventListener("input", onInput);
                delete input.dataset.omniyapGrow;
                input.style.height = "";
                input.style.overflowY = "";
            });
        };

        ctx.cleanup(ctx.watch(".composer textarea, .composer-box textarea", attach));
        ctx.cleanup(settings.onChange(() => {
            document.querySelectorAll(".composer textarea, .composer-box textarea").forEach((input) => resize(input));
        }));
    },
});
