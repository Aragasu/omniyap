import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, messageDate } from "./_shared.js";

const settings = definePluginSettings({
    hideUnder: { type: OptionType.SLIDER, description: "Hide the label when the last message is newer than this many minutes.", default: 10, min: 0, max: 60, step: 1 },
});

function lastMessageTime() {
    const state = store.getState();
    const channelId = state?.activeChannelId || store.activeChannelId?.();
    const list = state?.messages?.[channelId] || [];
    const last = list[list.length - 1];
    return messageDate(last) || null;
}

export default definePlugin({
    name: "TimeSinceLastMessage",
    description: "Shows in the chat header how long the channel has been quiet, so you can tell at a glance if it is dead.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        let label = null;

        const ensure = () => {
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head) return null;
            if (!label || !label.isConnected) {
                label = h("span", { class: "omniyap-quiet", title: "Time since the last message" });
                head.appendChild(label);
            }
            return label;
        };

        const update = () => {
            const node = ensure();
            if (!node) return;
            const when = lastMessageTime();
            if (!when) {
                node.textContent = "";
                node.hidden = true;
                return;
            }
            const minutes = Math.floor((Date.now() - when.getTime()) / 60_000);
            const hideUnder = Math.max(0, Number(settings.store.hideUnder) || 0);
            if (minutes < hideUnder) {
                node.hidden = true;
                return;
            }
            node.hidden = false;
            const text = minutes < 60 ? `${Math.max(1, minutes)}m quiet` : minutes < 1440 ? `${Math.round(minutes / 60)}h quiet` : `${Math.round(minutes / 1440)}d quiet`;
            if (node.textContent !== text) node.textContent = text;
            node.title = `Last message ${when.toLocaleString()}`;
        };

        ctx.interval(update, 20_000);
        ctx.on("store:change", update);
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => label?.remove());
        update();
    },
});
