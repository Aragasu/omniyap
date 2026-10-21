import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const REPLACEMENTS = [
    [/\bim\b/gi, "I'm"], [/\bive\b/gi, "I've"], [/\bdont\b/gi, "don't"], [/\bcant\b/gi, "can't"],
    [/\bwont\b/gi, "won't"], [/\bisnt\b/gi, "isn't"], [/\barent\b/gi, "aren't"], [/\bwouldnt\b/gi, "wouldn't"],
    [/\bcouldnt\b/gi, "couldn't"], [/\bshouldnt\b/gi, "shouldn't"], [/\bthats\b/gi, "that's"], [/\bwhats\b/gi, "what's"],
    [/\bthier\b/gi, "their"], [/\bteh\b/gi, "the"], [/\badn\b/gi, "and"], [/\brecieve\b/gi, "receive"],
    [/\bseperate\b/gi, "separate"], [/\bdefinately\b/gi, "definitely"], [/\boccured\b/gi, "occurred"],
    [/\buntill\b/gi, "until"], [/\bwich\b/gi, "which"], [/\bu\b/gi, "you"], [/\bur\b/gi, "your"],
    [/\bpls\b/gi, "please"], [/\bplz\b/gi, "please"], [/\bthx\b/gi, "thanks"], [/\bty\b/gi, "thank you"],
];

const settings = definePluginSettings({
    autoCapitalise: {
        type: OptionType.BOOLEAN,
        description: "Capitalise the first letter of each sentence.",
        default: true,
    },
    extraRules: {
        type: OptionType.STRING,
        description: "Extra rules, one per line, written as wrong=right.",
        default: "",
        multiline: true,
    },
});

function correct(text) {
    let out = text;
    for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);

    for (const line of String(settings.store.extraRules || "").split("\n")) {
        const [from, to] = line.split("=").map((part) => part?.trim());
        if (!from || to === undefined) continue;
        out = out.split(from).join(to);
    }

    if (settings.store.autoCapitalise) {
        out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, letter) => prefix + letter.toUpperCase());
        out = out.replace(/^(\s*)([a-z])/, (_match, space, letter) => space + letter.toUpperCase());
    }
    return out;
}

export default definePlugin({
    name: "AutoCorrect",
    description: "Fixes common typos and capitalisation when you send a message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const apply = () => {
            const composer = getComposer();
            if (!composer) return;
            const next = correct(composer.value);
            if (next !== composer.value) setNativeValue(composer, next);
        };

        const onKeyDown = (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            if (!(event.target instanceof Element) || !event.target.matches("textarea")) return;
            apply();
        };
        const onBlur = (event) => {
            if (event.target instanceof Element && event.target.matches(".composer textarea, .composer-box textarea")) apply();
        };

        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("blur", onBlur, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("blur", onBlur, true);
        });
    },
});
