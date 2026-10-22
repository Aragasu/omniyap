import { definePlugin, store, messages as messageApi } from "../core/api.js";
import { h, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

function collect() {
    const state = store.getState();
    const channelId = state?.activeChannelId;
    const list = state?.messages?.[channelId] || [];
    const authors = new Set();
    const hours = new Array(24).fill(0);
    let attachments = 0;
    let reactions = 0;
    let links = 0;
    let first = null;
    let last = null;

    for (const message of list) {
        const author = message?.author_id || message?.user_id;
        if (author) authors.add(author);
        attachments += (message?.attachments || []).length;
        reactions += Array.isArray(message?.reactions) ? message.reactions.length : Object.keys(message?.reactions || {}).length;
        const text = String(messageApi.content(message) || "");
        if (/https?:\/\//.test(text)) links++;
        const at = message?.created_at || message?.timestamp;
        const date = at ? new Date(at) : null;
        if (date && !Number.isNaN(date.getTime())) {
            hours[date.getHours()]++;
            if (!first || date < first) first = date;
            if (!last || date > last) last = date;
        }
    }

    const busiest = hours.indexOf(Math.max(...hours));
    return {
        channel: store.channel(channelId),
        channelName: store.channelName(channelId),
        loaded: list.length,
        authors: authors.size,
        attachments,
        reactions,
        links,
        first,
        last,
        busiest: list.length ? `${String(busiest).padStart(2, "0")}:00` : "—",
        perAuthor: list.length / Math.max(1, authors.size),
    };
}

export default definePlugin({
    name: "ChannelStats",
    description: "Shows a compact dashboard of the open channel: messages, authors, attachments, reactions and peak hour.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "productivity"],
    settings: undefined,

    start(ctx) {
        const open = () => {
            const data = collect();
            const rows = [
                ["Channel", data.channel ? `#${data.channelName || data.channel.name}` : "none"],
                ["Loaded messages", String(data.loaded)],
                ["Unique authors", String(data.authors)],
                ["Messages per author", data.loaded ? data.perAuthor.toFixed(1) : "0"],
                ["Attachments", String(data.attachments)],
                ["Reactions", String(data.reactions)],
                ["Messages with links", String(data.links)],
                ["Busiest hour", data.busiest],
                ["Oldest loaded", data.first ? formatTime(data.first) : "—"],
                ["Newest loaded", data.last ? formatTime(data.last) : "—"],
            ];
            openModal({
                title: "Channel stats",
                subtitle: `#${data.channelName || "channel"}`,
                width: 560,
                body: h("div", {}, ...rows.map(([label, value]) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" }, h("b", {}, label)),
                    h("span", { class: "omniyap-muted" }, value),
                ))),
                actions: [{
                    label: "Copy summary",
                    onClick: () => {
                        navigator.clipboard.writeText(rows.map(([label, value]) => `${label}: ${value}`).join("\n"));
                        ctx.toast("Summary copied", { type: "success" });
                    },
                }],
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "channel-stats",
            label: "Channel stats",
            icon: "▦",
            description: "A dashboard for the open channel.",
            onClick: open,
        }));
    },
});
