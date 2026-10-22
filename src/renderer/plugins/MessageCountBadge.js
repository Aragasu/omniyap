import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    label: { type: OptionType.BOOLEAN, description: "Show the word messages next to the number.", default: false },
});

export default definePlugin({
    name: "MessageCountBadge",
    description: "Shows how many messages are loaded for the channel you are reading, next to the channel name.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "chat"],
    settings,

    start(ctx) {
        let badge = null;

        const ensure = () => {
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head) return null;
            if (!badge || !badge.isConnected) {
                badge = h("span", { class: "omniyap-msg-count", title: "Messages loaded in this channel" });
                head.appendChild(badge);
            }
            return badge;
        };

        const update = () => {
            const node = ensure();
            if (!node) return;
            const state = store.getState();
            const channelId = state?.activeChannelId || store.activeChannelId?.();
            const list = state?.messages?.[channelId] || [];
            const count = Array.isArray(list) ? list.length : 0;
            const text = settings.store.label ? `${count} shown` : String(count);
            if (node.textContent !== text) node.textContent = text;
            node.hidden = count === 0;
        };

        ctx.interval(update, 3000);
        ctx.on("store:change", update);
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => badge?.remove());
        update();
        ctx.css(`
            .omniyap-msg-count{font:600 10px ui-monospace,SFMono-Regular,monospace;color:#8e919e;
                background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:999px;
                padding:1px 7px;margin-left:8px;font-variant-numeric:tabular-nums;white-space:nowrap}
            .omniyap-msg-count[hidden]{display:none}
        `);
    },
});
