import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Enable the browser's spell checker in the message box.", default: true },
    language: { type: OptionType.STRING, description: "Language code (leave empty for the system language).", default: "" },
});

export default definePlugin({
    name: "SpellcheckToggle",
    description: "Turns the composer's spell checker on or off and lets you pick a dictionary language, independent of the rest of the app.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "accessibility"],
    settings,

    start(ctx) {
        const apply = () => {
            const composer = document.querySelector(".composer textarea, .composer-box textarea");
            if (!(composer instanceof HTMLTextAreaElement)) return;
            composer.spellcheck = !!settings.store.enabled;
            if (settings.store.language) composer.lang = String(settings.store.language);
            else composer.removeAttribute("lang");
        };

        ctx.watch(".composer textarea", apply);
        ctx.onMutate(apply);
        ctx.cleanup(settings.onChange(apply));
        apply();
    },
});
