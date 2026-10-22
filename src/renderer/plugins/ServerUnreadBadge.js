import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    mentionsOnly: { type: OptionType.BOOLEAN, description: "Count only channels that mention you.", default: false },
});

function unreadFor(serverId, state) {
    const channels = state.channels || {};
    let count = 0;
    for (const [id, channel] of Object.entries(channels)) {
        if (!channel || channel.server_id !== serverId) continue;
        const unread = settings.store.mentionsOnly ? state.mentions?.[id] : state.unread?.[id];
        const mentions = state.mentions?.[id];
        if (unread || (settings.store.mentionsOnly && mentions)) count++;
    }
    return count;
}

export default definePlugin({
    name: "ServerUnreadBadge",
    description: "Puts an unread counter on each server icon in the rail, so you can see which community is active at a glance.",
    authors: [{ name: "OmniYap" }],
    tags: ["servers", "navigation"],
    settings,

    start(ctx) {
        const update = () => {
            const state = store.getState();
            if (!state) return;
            document.querySelectorAll("nav.rail [data-rail-row]").forEach((row) => {
                const serverId = row.getAttribute("data-rail-row");
                if (!serverId) return;
                const total = unreadFor(serverId, state);
                let badge = row.querySelector(".omniyap-server-unread");
                if (!total) {
                    badge?.remove();
                    return;
                }
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "omniyap-server-unread";
                    (row.querySelector(".rail-wrap") || row).appendChild(badge);
                }
                const label = total > 99 ? "99+" : String(total);
                if (badge.textContent !== label) badge.textContent = label;
                const title = `${total} unread channel${total === 1 ? "" : "s"}`;
                if (badge.title !== title) badge.title = title;
            });
        };
        ctx.on("store:change", (state, previous) => {
            if (state.unread !== previous.unread || state.mentions !== previous.mentions || state.channels !== previous.channels) update();
        });
        ctx.onMutate(update);
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-server-unread").forEach((node) => node.remove()));
        ctx.css(`
            .omniyap-server-unread{position:absolute;right:-3px;bottom:-3px;min-width:16px;height:16px;border-radius:999px;
                background:#f0a75d;color:#1c1204;font:800 9.5px Inter,system-ui,sans-serif;display:flex;align-items:center;
                justify-content:center;padding:0 4px;border:2px solid #121218;pointer-events:none;z-index:2}
            nav.rail [data-rail-row] .rail-wrap{position:relative}
        `);
        update();
    },
});
