import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
    size: { type: OptionType.SLIDER, description: "Size of jumbo emoji in pixels.", default: 44, min: 24, max: 72, step: 2 },
});

const CLEAN = /[\ufe0f\u200d\s\u20e3]/g;

function countGlyphs(text) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        return [...segmenter.segment(text)].length;
    }
    return [...text.replace(CLEAN, "")].length;
}

function isEmojiOnly(text) {
    const value = text.trim();
    if (!value) return false;
    const single = /^\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u200D\p{Extended_Pictographic})*$/u;
    if (!single.test(value.replace(/\s+/g, ""))) return false;
    return countGlyphs(value.replace(/\s+/g, "")) <= 3;
}

export default definePlugin({
    name: "JumboEmoji",
    description: "Messages that are only an emoji or two are shown big, like other chat apps. Works with combined and modified emoji.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const decorate = ({ el, message, textEl }) => {
            if (!textEl) return;
            const text = message ? (message.content ?? message.text ?? message.body ?? "") : textEl.textContent;
            const jumbo = isEmojiOnly(String(text)) && !textEl.querySelector("img, video, pre, code");
            el.classList.toggle("omniyap-jumbo", jumbo);
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => {
            document.documentElement.style.setProperty("--omniyap-jumbo-size", `${Math.max(24, Number(settings.store.size) || 44)}px`);
        }));
        document.documentElement.style.setProperty("--omniyap-jumbo-size", `${Math.max(24, Number(settings.store.size) || 44)}px`);
        ctx.cleanup(() => document.documentElement.style.removeProperty("--omniyap-jumbo-size"));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-jumbo").forEach((el) => el.classList.remove("omniyap-jumbo")));
        ctx.css(`
            .msg.omniyap-jumbo .msg-text{font-size:var(--omniyap-jumbo-size,44px);line-height:1.15;padding:3px 0}
            .msg.omniyap-jumbo .msg-text *{font-size:inherit!important;line-height:inherit!important}
        `);
    },
});
