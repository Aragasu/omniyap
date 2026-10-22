import { definePlugin, store } from "../core/api.js";
import { h, messageAuthorId } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

function counts(channelId) {
    const totals = new Map();
    for (const message of store.messages(channelId)) {
        const id = messageAuthorId(message);
        if (!id) continue;
        totals.set(id, (totals.get(id) || 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

function openBoard() {
    const channelId = store.activeChannelId();
    const rows = counts(channelId).slice(0, 15);
    const top = rows[0]?.[1] || 1;
    openModal({
        title: "Chatter leaderboard",
        subtitle: `#${store.channelName(channelId) || "channel"} · ${store.messages(channelId).length} loaded messages`,
        width: 620,
        body: rows.length ? h("div", {}, ...rows.map(([id, count], index) => h("div", { class: "omniyap-lb-row" },
            h("span", { class: "omniyap-lb-rank" }, String(index + 1)),
            h("span", { class: "omniyap-lb-name", title: store.username(id) }, store.displayName(id)),
            h("span", { class: "omniyap-lb-bar" }, h("i", { style: { width: `${Math.max(3, (count / top) * 100)}%` } })),
            h("span", { class: "omniyap-lb-count" }, String(count)),
        ))) : h("div", { class: "omniyap-empty" }, "No loaded messages in this channel."),
    });
}

export default definePlugin({
    name: "ChatterLeaderboard",
    description: "Ranks the people who have sent the most messages in the open channel, with a bar for each person.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        ctx.cleanup(ui.registerTool({
            id: "chatter-leaderboard",
            label: "Chatter leaderboard",
            icon: "≡",
            description: "Who talks the most in this channel.",
            onClick: openBoard,
        }));
        ctx.css(`
            .omniyap-lb-row{display:flex;align-items:center;gap:9px;padding:5px 0}
            .omniyap-lb-rank{font:700 11px Inter,system-ui,sans-serif;color:#7d808c;width:18px;text-align:right}
            .omniyap-lb-name{font:600 12px Inter,system-ui,sans-serif;color:#e0e2e8;width:150px;flex:none;
                overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .omniyap-lb-bar{flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.05);overflow:hidden}
            .omniyap-lb-bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#8b39fd,#c48bff)}
            .omniyap-lb-count{font:700 11px Inter,system-ui,sans-serif;color:#a9abb6;width:44px;text-align:right;font-variant-numeric:tabular-nums}
        `);
    },
});
