import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const KAOMOJI = {
    shrug: "\u00af\\_(\u30c4)_/\u00af",
    tableflip: "(\u256f\u00b0\u25a1\u00b0)\u256f\ufe35 \u253b\u2501\u253b",
    unflip: "\u252c\u2500\u252c \u30ce( \u309c-\u309c\u30ce)",
    lenny: "( \u0361\u00b0 \u035c\u0296 \u0361\u00b0)",
    disapprove: "\u0ca0_\u0ca0",
    bear: "\u0295\u2022\u1d25\u2022\u0294",
    eyeroll: "(\u30fb\u2200\u30fb)\u30ce",
    happy: "(\u02c6\u203f\u02c6)",
    sad: "(\u00b4\uff61_\uff61`)",
    excited: "(\u3063\u25d4\u25e1\u25d4)\u3063",
    angry: "\u0f3c\u0f3a\u0f3b",
    run: "\u30ce(\u30fb\u2200\u30fb)\u30ce",
    dance: "\u251b(\uff9f\u25bd\uff9f)\u2501\u251b",
    punch: "(\u0e07 \u0360\u0e07)",
    wait: "(\u25a0_\u25a0)",
    thanks: "(\u2267\u25bd\u2266)",
};

const settings = definePluginSettings({
    replaceOnSend: { type: OptionType.BOOLEAN, description: "Replace codes while sending.", default: true },
    shortcuts: { type: OptionType.BOOLEAN, description: "Also replace a message that is only the word, like shrug.", default: true },
});

function expand(text) {
    let value = String(text).replace(/:([a-z]+):/gi, (whole, name) => KAOMOJI[String(name).toLowerCase()] || whole);
    if (settings.store.shortcuts) {
        const trimmed = value.trim();
        const direct = KAOMOJI[trimmed.toLowerCase()];
        if (direct && trimmed.toLowerCase() !== "unflip" && trimmed.toLowerCase() !== "tableflip") value = value.replace(trimmed, direct);
    }
    return value;
}

export default definePlugin({
    name: "ShrugText",
    description: "Expands :shrug:, :tableflip:, :lenny:, :dance: and other kaomoji codes when you send, including typing just the word.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "fun"],
    settings,

    start(ctx) {
        if (!settings.store.replaceOnSend) return;
        ctx.cleanup(interceptSend((text) => expand(text)));
    },
});
