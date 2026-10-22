import { definePlugin, definePluginSettings, OptionType, store, messages as messageApi } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    wordsPerMinute: { type: OptionType.SLIDER, description: "Reading speed used for the estimate.", default: 220, min: 100, max: 400, step: 10 },
    includeAttachments: { type: OptionType.BOOLEAN, description: "Count attachment-only messages.", default: false },
});

function count() {
    const state = store.getState();
    const list = state?.messages?.[state.activeChannelId] || [];
    let words = 0;
    let characters = 0;
    let messages = 0;
    const authors = new Map();
    for (const message of list) {
        const text = String(messageApi.content(message) || "");
        if (!text.trim() && !(settings.store.includeAttachments && (message.attachments || []).length)) continue;
        messages++;
        words += text.trim() ? text.trim().split(/\s+/).length : 0;
        characters += text.length;
        const author = message.author_id || message.user_id;
        if (author) authors.set(author, (authors.get(author) || 0) + 1);
    }
    return { words, characters, messages, authors };
}

export default definePlugin({
    name: "WordCount",
    description: "Counts words, characters and messages in the open channel, with a reading-time estimate.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "productivity"],
    settings,

    start(ctx) {
        const open = () => {
            const data = count();
            const minutes = Math.max(1, Math.round(data.words / Math.max(100, Number(settings.store.wordsPerMinute) || 220)));
            const topAuthors = [...data.authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
            openModal({
                title: "Word count",
                subtitle: `#${store.channelName(store.activeChannelId()) || "channel"}`,
                width: 520,
                body: h("div", {},
                    ...[
                        ["Messages", data.messages],
                        ["Words", data.words],
                        ["Characters", data.characters],
                        ["Average words", data.messages ? Math.round(data.words / data.messages) : 0],
                        ["Reading time", `${minutes} min`],
                    ].map(([label, value]) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" }, h("b", {}, label)),
                        h("b", {}, String(value)),
                    )),
                    topAuthors.length ? h("div", { style: { marginTop: "12px" } },
                        h("div", { class: "omniyap-sec" }, "Most messages"),
                        ...topAuthors.map(([userId, total]) => h("div", { class: "omniyap-row" },
                            h("div", { class: "label" }, h("b", {}, store.displayName(userId) || userId)),
                            h("span", { class: "omniyap-muted" }, String(total)),
                        )),
                    ) : null,
                ),
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "word-count",
            label: "Word count",
            icon: "∑",
            description: "Words, characters and reading time for the open channel.",
            onClick: open,
        }));
    },
});
