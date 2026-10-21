import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    maxIndent: {
        type: OptionType.NUMBER,
        description: "Strip at most this many leading spaces from each line (0 = all).",
        default: 0,
    },
    trimBlankLines: {
        type: OptionType.BOOLEAN,
        description: "Remove leading and trailing blank lines.",
        default: true,
    },
});

export default definePlugin({
    name: "Unindent",
    description: "Removes accidental leading indentation from messages before they are sent.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const clean = (text) => {
            let lines = text.split("\n");
            if (settings.store.trimBlankLines) {
                while (lines.length && !lines[0].trim()) lines.shift();
                while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
            }
            const limit = Number(settings.store.maxIndent) || Infinity;
            let removed = 0;
            const indent = lines.reduce((min, line) => {
                if (!line.trim()) return min;
                const match = line.match(/^[ \t]*/)?.[0].length ?? 0;
                return Math.min(min, match);
            }, Infinity);
            const cut = Number.isFinite(indent) ? Math.min(indent, limit) : 0;
            if (cut > 0) lines = lines.map((line) => line.slice(cut));
            removed += cut;
            lines = lines.map((line) => line.replace(/\s+$/, ""));
            return lines.join("\n");
        };

        const composer = () => getComposer();
        const onKeyDown = (event) => {
            if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            const el = composer();
            if (!el || event.target !== el) return;
            const cleaned = clean(el.value);
            if (cleaned === el.value) return;
            setNativeValue(el, cleaned);
        };

        document.addEventListener("keydown", onKeyDown, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKeyDown, true));
    },
});
