import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    showUnread: { type: OptionType.BOOLEAN, description: "Show the unread count.", default: true },
    showMentions: { type: OptionType.BOOLEAN, description: "Show a separate mention count.", default: true },
    max: { type: OptionType.SLIDER, description: "Cap displayed counts at this number.", default: 99, min: 9, max: 999, step: 10 },
});

function toCount(value) {
    if (value === true) return 1;
    if (typeof value === "number") return value;
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Number(value.count) || Object.keys(value).length;
    return Number(value) || 0;
}

export default definePlugin({
    name: "ChannelBadges",
    description: "Adds unread and mention counters to channel rows in the sidebar, with a configurable cap.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance", "utility"],
    settings,

    start(ctx) {
        const apply = () => {
            const state = store.getState();
            if (!state?.channels) return;
            const cap = Math.max(9, Math.min(999, Number(settings.store.max) || 99));
            document.querySelectorAll("[data-channel-id]").forEach((row) => {
                const channelId = row.getAttribute("data-channel-id");
                const channel = state.channels[channelId];
                if (!channel) return;
                const unread = toCount(state.unread?.[channelId]) || toCount(channel.unread_count ?? channel.unread);
                const mentions = toCount(state.mentions?.[channelId]) || toCount(channel.mentions ?? channel.mention_count);
                const existing = row.querySelector(".omniyap-channel-badges");
                if ((!settings.store.showUnread || unread <= 0) && (!settings.store.showMentions || mentions <= 0)) {
                    existing?.remove();
                    return;
                }
                const wrapper = existing || h("span", { class: "omniyap-channel-badges" });
                wrapper.replaceChildren(
                    settings.store.showMentions && mentions > 0
                        ? h("span", { class: "mention", title: `${mentions} mentions` }, mentions > cap ? `${cap}+` : String(mentions))
                        : "",
                    settings.store.showUnread && unread > 0
                        ? h("span", { class: "unread", title: `${unread} unread` }, unread > cap ? `${cap}+` : String(unread))
                        : "",
                );
                if (!existing) row.appendChild(wrapper);
            });
        };

        ctx.onMutate(apply);
        ctx.on("store:change", (state, previous) => {
            if (state.unread !== previous.unread || state.mentions !== previous.mentions || state.channels !== previous.channels) apply();
        });
        ctx.interval(apply, 3000);
        ctx.cleanup(settings.onChange(apply));
        ctx.css(`
            [data-channel-id]{position:relative}
            .omniyap-channel-badges{margin-left:auto;display:inline-flex;align-items:center;gap:3px;flex:none;padding-left:4px}
            .omniyap-channel-badges .unread{min-width:16px;height:16px;padding:0 4px;border-radius:999px;display:grid;place-items:center;
                background:rgba(255,255,255,.12);color:#d6d7de;font:700 9.5px Inter,system-ui,sans-serif}
            .omniyap-channel-badges .mention{min-width:16px;height:16px;padding:0 4px;border-radius:999px;display:grid;place-items:center;
                background:#e5484d;color:#fff;font:700 9.5px Inter,system-ui,sans-serif;box-shadow:0 0 0 2px rgba(27,27,38,.9)}
        `);
        apply();
    },
});
