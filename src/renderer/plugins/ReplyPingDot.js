import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const LABELS = { reply: "Someone replied to you", ping: "You were mentioned", dm: "New direct message" };

const settings = definePluginSettings({
    reply: { type: OptionType.BOOLEAN, description: "When someone replies to one of your messages.", default: true },
    ping: { type: OptionType.BOOLEAN, description: "When someone mentions you with @.", default: true },
    everyone: { type: OptionType.BOOLEAN, description: "Also for @everyone and @here.", default: false },
    dm: { type: OptionType.BOOLEAN, description: "When someone sends you a direct message.", default: true },
});

function reasonFor(message, state, options) {
    if (!message || !state?.userId || message.author_id === state.userId) return null;
    const channel = state.channels?.[message.channel_id];
    if (!channel) return null;
    const text = String(message.content ?? message.text ?? "");
    if (options.reply && message.reply_to_id) {
        const target = store.findMessage(message.reply_to_id);
        if (target?.author_id === state.userId) return "reply";
    }
    if (options.ping) {
        if (text.includes(`<@${state.userId}>`)) return "ping";
        const username = state.profiles?.[state.userId]?.username;
        if (username) {
            const escaped = String(username).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            if (new RegExp(`(^|[^\\p{L}\\p{N}_])@${escaped}(?![\\p{L}\\p{N}_])`, "iu").test(text)) return "ping";
        }
        if (options.everyone && /(^|\s)@(everyone|here)(?![\p{L}\p{N}_])/iu.test(text)) return "ping";
    }
    if (options.dm && !channel.server_id) return "dm";
    return null;
}

export default definePlugin({
    name: "ReplyPingDot",
    description: "Shows a dot (amber for replies, red for mentions and DMs) on the chat when someone needs you. It clears when you open that chat.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "chat", "servers"],
    settings,

    start(ctx) {
        const attention = new Map(); // channelId -> reason
        const seen = new Set();

        const remember = () => {
            for (const list of Object.values(store.getState()?.messages || {})) {
                if (Array.isArray(list)) for (const message of list) if (message?.id) seen.add(message.id);
            }
        };

        function paint() {
            for (const dot of document.querySelectorAll(".omniyap-rpd")) {
                if (!attention.has(dot.dataset.channel)) dot.remove();
            }
            for (const [channelId, reason] of attention) {
                const hosts = document.querySelectorAll(`[data-nav-chan="${CSS.escape(channelId)}"]`);
                for (const host of hosts) {
                    if (!host.querySelector(":scope > .omniyap-rpd")) {
                        host.append(h("span", { class: "omniyap-rpd", "data-channel": channelId }));
                    }
                    const dot = host.querySelector(":scope > .omniyap-rpd");
                    dot.dataset.why = reason;
                    dot.title = LABELS[reason];
                    dot.setAttribute("aria-label", LABELS[reason]);
                }
            }
        }

        const scan = (state) => {
            let changed = false;
            for (const [channelId, list] of Object.entries(state.messages || {})) {
                if (!Array.isArray(list)) continue;
                for (let index = list.length - 1; index >= 0 && index >= list.length - 12; index--) {
                    const message = list[index];
                    if (!message?.id || seen.has(message.id)) continue;
                    seen.add(message.id);
                    if (message.pending || message.status === "sending") continue;
                    if (channelId === state.activeChannelId && !document.hidden) continue;
                    const reason = reasonFor(message, state, settings.store);
                    if (reason && attention.get(channelId) !== reason) {
                        attention.set(channelId, reason);
                        changed = true;
                    }
                }
            }
            if (changed) paint();
        };

        const clearActive = () => {
            const id = store.activeChannelId();
            if (id && attention.has(id) && !document.hidden) {
                attention.delete(id);
                paint();
            }
        };

        ctx.css(`
            .omniyap-rpd{position:absolute;top:50%;right:9px;margin-top:-5px;width:10px;height:10px;border-radius:50%;
                background:#f2555a;box-shadow:0 0 0 2px var(--bg-side,#1b1c21),0 0 6px rgba(242,85,90,.7);
                pointer-events:none;z-index:3}
            .omniyap-rpd[data-why="reply"]{background:#f59e0b}
            .omniyap-rpd[data-why="dm"]{background:#8b39fd}
            @media (prefers-reduced-motion:no-preference){
                .omniyap-rpd{animation:omniyapRpd 1.8s ease-in-out infinite}
                @keyframes omniyapRpd{50%{transform:scale(1.18)}}
            }
        `);

        ctx.on("store:change", (state, previous) => {
            if (state.messages !== previous.messages) scan(state);
            if (state.activeChannelId !== previous.activeChannelId) clearActive();
        });
        ctx.onMutate(() => {
            clearActive();
            if (attention.size) paint();
        });
        ctx.cleanup(() => document.querySelectorAll(".omniyap-rpd").forEach((dot) => dot.remove()));

        remember();
        ctx.interval(clearActive, 1500);
    },
});
