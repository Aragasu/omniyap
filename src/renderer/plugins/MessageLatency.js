import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const history = localJson("send-latency", []);
const settings = definePluginSettings({
    showBadge: { type: OptionType.BOOLEAN, description: "Show the latest round-trip time above the composer.", default: true },
    windowMs: { type: OptionType.SLIDER, description: "Maximum time to wait for the message to appear (seconds).", default: 12, min: 3, max: 30, step: 1 },
});

function isMine(message) {
    return message && (message.author_id || message.user_id) === store.myId();
}

export default definePlugin({
    name: "MessageLatency",
    description: "Measures how long it takes from pressing send to the message appearing, and keeps a small history.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "developer"],
    settings,

    start(ctx) {
        let pending = null;
        let badge = null;
        let hideTimer = null;

        const baseline = (channelId) => store.messages(channelId).length;

        const arm = () => {
            const channelId = store.activeChannelId();
            if (!channelId) return;
            pending = { channelId, at: performance.now(), count: baseline(channelId) };
            ctx.timeout(() => {
                if (pending) pending = null;
            }, Math.max(3, Number(settings.store.windowMs) || 12) * 1000);
        };

        const show = (ms) => {
            if (!settings.store.showBadge) return;
            const composer = document.querySelector(".composer, .composer-box");
            if (!composer?.parentElement) return;
            badge?.remove();
            clearTimeout(hideTimer);
            badge = h("span", { class: "omniyap-latency" },
                h("i", { style: { background: ms < 400 ? "#30a46c" : ms < 1200 ? "#f5a524" : "#e5484d" } }),
                `${Math.round(ms)} ms`,
            );
            composer.parentElement.insertBefore(badge, composer);
            hideTimer = setTimeout(() => badge?.remove(), 4500);
        };

        const finish = (ms) => {
            const entries = history.read();
            entries.push({ ms, at: Date.now() });
            history.write(entries.slice(-100));
            show(ms);
        };

        const onKeyDown = (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            if (event.target instanceof Element && event.target.closest("textarea, input, [contenteditable]")) arm();
        };
        const onClick = (event) => {
            if (event.target instanceof Element && event.target.closest(".send-btn, [aria-label='Send'], button[type='submit']")) arm();
        };

        ctx.on("store:change", (state, previous) => {
            if (!pending || !state?.messages) return;
            const list = state.messages[pending.channelId] || [];
            if (list.length <= pending.count) return;
            const sent = list.slice(pending.count).find(isMine);
            if (!sent) return;
            const ms = performance.now() - pending.at;
            pending = null;
            finish(ms);
        });

        const open = () => {
            const entries = history.read();
            const average = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.ms, 0) / entries.length) : 0;
            openModal({
                title: "Send latency",
                subtitle: entries.length ? `${entries.length} samples · ${average} ms average` : "No samples yet",
                width: 520,
                body: h("div", {},
                    entries.length ? entries.slice().reverse().map((entry) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" }, h("b", {}, `${Math.round(entry.ms)} ms`), h("span", {}, new Date(entry.at).toLocaleString())),
                        h("span", { class: `omniyap-latency-dot ${entry.ms < 400 ? "good" : entry.ms < 1200 ? "ok" : "bad"}` }),
                    )) : h("div", { class: "omniyap-empty" }, "Send a message to collect the first sample."),
                ),
                actions: [{
                    label: "Clear",
                    onClick: ({ close }) => {
                        history.write([]);
                        close();
                    },
                }],
            });
        };

        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("click", onClick, true);
        ctx.cleanup(ui.registerTool({
            id: "send-latency",
            label: "Send latency",
            icon: "⏱",
            description: "Round-trip time between pressing send and seeing your message.",
            onClick: open,
        }));
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("click", onClick, true);
            badge?.remove();
            clearTimeout(hideTimer);
        });
        ctx.css(`
            .omniyap-latency{display:flex;align-items:center;gap:5px;margin:0 8px 3px;color:#8b8d98;
                font:500 10px ui-monospace,SFMono-Regular,Menlo,monospace;align-self:flex-end}
            .omniyap-latency i{width:6px;height:6px;border-radius:50%;display:block}
            .omniyap-latency-dot{width:7px;height:7px;border-radius:50%;flex:none}
            .omniyap-latency-dot.good{background:#30a46c}.omniyap-latency-dot.ok{background:#f5a524}.omniyap-latency-dot.bad{background:#e5484d}
        `);
    },
});
