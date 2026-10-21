import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
    saturation: {
        type: OptionType.SLIDER,
        description: "Colour saturation.",
        default: 55,
        min: 20,
        max: 90,
        step: 5,
    },
    lightness: {
        type: OptionType.SLIDER,
        description: "Colour lightness (higher is easier on dark backgrounds).",
        default: 72,
        min: 45,
        max: 88,
        step: 1,
    },
});

function hash(text) {
    let value = 0;
    for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0;
    return value;
}

export default definePlugin({
    name: "IrcColors",
    description: "Gives every author a stable colour derived from their username, IRC style.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    settings,

    start(ctx) {
        const decorate = ({ head }) => {
            const author = head?.querySelector(".msg-author");
            if (!author) return;
            const name = author.textContent.trim();
            if (!name) return;
            const hue = hash(name) % 360;
            author.style.color = `hsl(${hue} ${settings.store.saturation}% ${settings.store.lightness}%)`;
        };
        ctx.cleanup(messages.decorate(decorate));
    },
});
