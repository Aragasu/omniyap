import { definePlugin, definePluginSettings, OptionType, store, messages as messageApi } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

const settings = definePluginSettings({
    scope: {
        type: OptionType.SELECT,
        description: "Which messages to count.",
        options: [
            { label: "Open channel", value: "channel" },
            { label: "Every loaded channel", value: "all" },
        ],
        default: "channel",
    },
    limit: { type: OptionType.SLIDER, description: "How many emoji to show.", default: 20, min: 5, max: 50, step: 5 },
});

function collect() {
    const state = store.getState();
    const active = state?.activeChannelId;
    const counts = new Map();
    const authors = new Map();
    const channels = settings.store.scope === "all" ? Object.keys(state?.messages || {}) : [active];
    for (const channelId of channels) {
        for (const message of state?.messages?.[channelId] || []) {
            const text = messageApi.content(message);
            for (const match of String(text).matchAll(EMOJI)) {
                counts.set(match[0], (counts.get(match[0]) || 0) + 1);
                const author = message?.author_id || message?.user_id;
                if (author) authors.set(author, (authors.get(author) || 0) + 1);
            }
        }
    }
    return { counts, authors, channels: channels.filter(Boolean).length };
}

export default definePlugin({
    name: "EmojiStats",
    description: "Counts which emoji you and your friends use most in the loaded messages.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "fun"],
    settings,

    start(ctx) {
        const open = () => {
            const { counts, authors, channels } = collect();
            const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(settings.store.limit) || 20);
            const topAuthors = [...authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
            const max = top[0]?.[1] || 1;
            openModal({
                title: "Emoji stats",
                subtitle: `${[...counts.values()].reduce((sum, n) => sum + n, 0)} emoji across ${channels} channel${channels === 1 ? "" : "s"}`,
                width: 560,
                body: h("div", {},
                    top.length ? h("div", {}, ...top.map(([emoji, count]) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" }, h("b", { style: { fontSize: "16px" } }, emoji), h("span", {}, `${count} use${count === 1 ? "" : "s"}`)),
                        h("div", { class: "omniyap-emoji-bar" }, h("i", { style: { width: `${Math.max(4, (count / max) * 100)}%` } })),
                    ))) : h("div", { class: "omniyap-empty" }, "No emoji in the loaded messages."),
                    topAuthors.length ? h("div", { style: { marginTop: "16px" } },
                        h("div", { class: "omniyap-sec", style: { marginTop: "0" } }, "Top users"),
                        ...topAuthors.map(([userId, count]) => h("div", { class: "omniyap-row" },
                            h("div", { class: "label" }, h("b", {}, store.displayName(userId) || userId), h("span", {}, `${count} emoji`)),
                        )),
                    ) : null,
                ),
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "emoji-stats",
            label: "Emoji stats",
            icon: "☺",
            description: "See the most-used emoji in a channel.",
            onClick: open,
        }));
        ctx.css(`
            .omniyap-emoji-bar{width:140px;height:6px;border-radius:999px;background:#2b2b39;overflow:hidden;flex:none}
            .omniyap-emoji-bar i{display:block;height:100%;background:linear-gradient(90deg,#8b39fd,#b57bff);border-radius:inherit}
        `);
    },
});
