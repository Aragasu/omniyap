import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { parseList } from "./_shared.js";

const COLORS = {
    amber: { background: "rgba(245,165,36,.35)", underline: "#f5a524" },
    purple: { background: "rgba(139,57,253,.35)", underline: "#b57bff" },
    green: { background: "rgba(48,164,108,.32)", underline: "#6ede9f" },
    red: { background: "rgba(229,72,77,.32)", underline: "#ff9b9b" },
};

const settings = definePluginSettings({
    words: { type: OptionType.STRING, description: "Words or phrases to highlight, comma separated.", default: "", multiline: true },
    color: {
        type: OptionType.SELECT,
        description: "Highlight colour.",
        options: Object.keys(COLORS).map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
        default: "amber",
    },
    caseSensitive: { type: OptionType.BOOLEAN, description: "Match exact case.", default: false },
    wholeWords: { type: OptionType.BOOLEAN, description: "Only match whole words.", default: true },
});

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default definePlugin({
    name: "KeywordHighlight",
    description: "Paints your important words in messages so you can scan a busy channel quickly.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance", "utility"],
    settings,

    start(ctx) {
        if (!CSS.highlights || typeof Highlight !== "function") {
            ctx.log.warn("the CSS Custom Highlight API is not available");
            return;
        }

        let pattern = null;
        let ranges = [];

        const build = () => {
            const words = parseList(settings.store.words, 120).map(escapeRegex);
            const flags = settings.store.caseSensitive ? "g" : "gi";
            pattern = words.length
                ? new RegExp(settings.store.wholeWords ? `(?<![\\p{L}\\p{N}])(?:${words.join("|")})(?![\\p{L}\\p{N}])` : `(?:${words.join("|")})`, `${flags}u`)
                : null;
            const color = COLORS[settings.store.color] || COLORS.amber;
            CSS.highlights.set("omniyap-keyword", new Highlight());
            ctx.css(`
                ::highlight(omniyap-keyword){background-color:${color.background};color:#fff;
                    text-decoration:underline;text-decoration-color:${color.underline};text-decoration-thickness:2px}
            `);
        };

        const apply = () => {
            if (!pattern) {
                CSS.highlights.set("omniyap-keyword", new Highlight());
                ranges = [];
                return;
            }
            ranges = [];
            document.querySelectorAll(".msg-text").forEach((text) => {
                const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                    pattern.lastIndex = 0;
                    for (let match = pattern.exec(node.data); match; match = pattern.exec(node.data)) {
                        const range = new Range();
                        range.setStart(node, match.index);
                        range.setEnd(node, match.index + match[0].length);
                        ranges.push(range);
                        if (!match[0].length) pattern.lastIndex++;
                    }
                }
            });
            CSS.highlights.set("omniyap-keyword", new Highlight(...ranges.slice(0, 4000)));
        };

        build();
        apply();
        ctx.onMutate(apply);
        ctx.on("store:change", apply);
        ctx.cleanup(settings.onChange(() => {
            build();
            apply();
        }));
        ctx.cleanup(() => CSS.highlights.delete("omniyap-keyword"));
    },
});
