import { definePlugin } from "../core/api.js";
import { interceptSend } from "./_shared.js";

export default definePlugin({
    name: "RandomPicker",
    description: "Type /pick pizza, sushi, tacos and the composer sends one option at random. Commas or new lines both work.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "utility"],

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            const match = /^\/pick\s+([\s\S]+)$/i.exec(String(text).trim());
            if (!match) return text;
            const options = match[1].split(/[,;\n]+/).map((option) => option.trim()).filter(Boolean).slice(0, 50);
            if (options.length < 2) return text;
            const picked = options[Math.floor(Math.random() * options.length)];
            return `🎯 Picked **${picked}** out of ${options.length}.`;
        }));
    },
});
