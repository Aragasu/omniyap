import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const settings = definePluginSettings({
    showBreakdown: { type: OptionType.BOOLEAN, description: "Show every die in the result.", default: true },
});

function roll(count, sides) {
    const values = [];
    for (let index = 0; index < count; index++) values.push(1 + Math.floor(Math.random() * sides));
    return values;
}

export default definePlugin({
    name: "DiceRoller",
    description: "Type /roll 2d20+3 (or /r d6) and the composer sends a rolled result, with the individual dice when you want them.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "utility"],
    settings,

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            const match = /^\/(?:roll|r)\s+(\d{0,3})d(\d{1,4})(?:\s*([+-])\s*(\d{1,4}))?$/i.exec(String(text).trim());
            if (!match) return text;
            const count = Math.max(1, Math.min(100, Number(match[1]) || 1));
            const sides = Math.max(2, Math.min(1000, Number(match[2]) || 6));
            const modifier = (Number(match[4]) || 0) * (match[3] === "-" ? -1 : 1);
            const values = roll(count, sides);
            const total = values.reduce((sum, value) => sum + value, 0) + modifier;
            const expression = `${count}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ""}`;
            const breakdown = settings.store.showBreakdown && count > 1 ? ` (${values.join(" + ")}${modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : ""})` : "";
            return `🎲 ${expression}: **${total}**${breakdown}`;
        }));
    },
});
