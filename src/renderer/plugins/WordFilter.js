import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";

const COMMON = ["fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "piss", "slut", "whore", "motherfucker", "bullshit"];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const settings = definePluginSettings({
    common: { type: OptionType.BOOLEAN, description: "Filter common swear words.", default: true },
    words: { type: OptionType.STRING, description: "Extra words to filter, separated by commas.", default: "", multiline: true },
    mode: {
        type: OptionType.SELECT,
        description: "What to do with a message that contains a filtered word.",
        options: [
            { label: "Blur the word", value: "blur" },
            { label: "Cover the word with a bar", value: "bar" },
            { label: "Collapse the whole message", value: "hide" },
        ],
        default: "blur",
    },
    hideUsers: { type: OptionType.STRING, description: "Usernames whose messages are always hidden, separated by commas.", default: "" },
});

function compile() {
    const words = [...(settings.store.common ? COMMON : []), ...String(settings.store.words || "").split(/[\n,;]+/)];
    const cleaned = words.map((word) => word.trim()).filter(Boolean).slice(0, 500).map(escapeRegex);
    try {
        return cleaned.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${cleaned.join("|")})(?![\\p{L}\\p{N}])`, "giu") : null;
    } catch {
        return null;
    }
}

export default definePlugin({
    name: "WordFilter",
    description: "Hides words you never want to see, on your screen only: blurred, covered, or the whole message collapsed. Click a hidden message to reveal it.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "privacy", "utility"],
    settings,

    start(ctx) {
        const supported = typeof CSS !== "undefined" && CSS.highlights && typeof Highlight === "function";
        const revealed = new WeakSet();
        let pattern = compile();
        let hiddenUsers = new Set();

        const rebuild = () => {
            pattern = compile();
            hiddenUsers = new Set(
                String(settings.store.hideUsers || "")
                    .split(/[\n,;]+/)
                    .map((name) => name.trim().replace(/^@/, "").toLowerCase())
                    .filter(Boolean),
            );
        };

        const apply = () => {
            const ranges = { blur: [], bar: [] };
            for (const row of document.querySelectorAll(messages.selector)) {
                const info = messages.info(row);
                const message = info.message;
                if (!message) continue;
                const username = store.profile(message.author_id)?.username?.toLowerCase();
                const mutedAuthor = !!username && hiddenUsers.has(username);
                const mine = message.author_id === store.myId();

                const matched = [];
                if (pattern && info.textEl) {
                    const walker = document.createTreeWalker(info.textEl, NodeFilter.SHOW_TEXT);
                    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                        pattern.lastIndex = 0;
                        for (let match = pattern.exec(node.data); match; match = pattern.exec(node.data)) {
                            matched.push([node, match.index, match.index + match[0].length]);
                            if (!match[0].length) pattern.lastIndex++;
                        }
                    }
                }

                const flagged = (mutedAuthor || matched.length > 0) && !mine;
                if (!flagged) {
                    row.removeAttribute("data-omniyap-wf");
                    row.removeAttribute("data-omniyap-wf-open");
                    continue;
                }

                const mode = mutedAuthor ? "hide" : settings.store.mode;
                row.setAttribute("data-omniyap-wf", mode);
                if (mode !== "hide" || revealed.has(row)) {
                    row.removeAttribute("data-omniyap-wf-open");
                    if (mode !== "hide") {
                        for (const [node, start, end] of matched) {
                            const range = new Range();
                            range.setStart(node, start);
                            range.setEnd(node, end);
                            ranges[mode === "bar" ? "bar" : "blur"].push(range);
                        }
                    }
                } else {
                    row.removeAttribute("data-omniyap-wf-open");
                }
            }
            if (supported) {
                CSS.highlights.set("omniyap-wf-blur", new Highlight(...ranges.blur));
                CSS.highlights.set("omniyap-wf-bar", new Highlight(...ranges.bar));
            }
        };

        const onClick = (event) => {
            const row = event.target instanceof Element ? event.target.closest(".msg[data-omniyap-wf]") : null;
            if (!row || event.target.closest("a,button,input,textarea")) return;
            if (revealed.has(row)) revealed.delete(row);
            else revealed.add(row);
            if (revealed.has(row)) row.setAttribute("data-omniyap-wf-open", "1");
            apply();
        };

        ctx.css(`
            ::highlight(omniyap-wf-blur){color:transparent;text-shadow:0 0 7px rgba(225,225,232,.95)}
            ::highlight(omniyap-wf-bar){color:transparent;background-color:#6b6d79}
            .msg[data-omniyap-wf]{cursor:pointer}
            .msg[data-omniyap-wf="hide"]:not([data-omniyap-wf-open]) > .msg-body > :not(.msg-head),
            .msg[data-omniyap-wf="hide"]:not([data-omniyap-wf-open]) > .msg-actions{display:none!important}
            .msg[data-omniyap-wf="hide"]:not([data-omniyap-wf-open]) > .msg-body::after{
                content:"Hidden by your filter. Click to show.";display:block;font-size:12px;color:#6e6f7b;padding:2px 0}
        `);

        document.addEventListener("click", onClick, true);
        rebuild();
        apply();
        ctx.onMutate(apply);
        ctx.on("store:change", (state, previous) => {
            if (state.profiles !== previous.profiles) apply();
        });
        ctx.cleanup(settings.onChange(() => {
            rebuild();
            apply();
        }));
        ctx.cleanup(() => {
            document.removeEventListener("click", onClick, true);
            if (supported) {
                CSS.highlights.delete("omniyap-wf-blur");
                CSS.highlights.delete("omniyap-wf-bar");
            }
            document.querySelectorAll(".msg[data-omniyap-wf]").forEach((row) => {
                row.removeAttribute("data-omniyap-wf");
                row.removeAttribute("data-omniyap-wf-open");
            });
        });
    },
});
