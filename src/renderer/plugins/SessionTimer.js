import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, formatDuration } from "./_shared.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    header: { type: OptionType.BOOLEAN, description: "Show the session timer in the header.", default: false },
});

export default definePlugin({
    name: "SessionTimer",
    description: "Tracks how long this session has been open, available as a header clock and a tool that reports the total.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility"],
    settings,

    start(ctx) {
        const started = Date.now();
        const elapsed = () => Date.now() - started;
        let clock = null;

        const ensure = () => {
            if (!settings.store.header) {
                clock?.remove();
                clock = null;
                return null;
            }
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head) return null;
            if (!clock || !clock.isConnected) {
                clock = h("span", { class: "omniyap-timer", title: "Time in this session" });
                head.appendChild(clock);
            }
            return clock;
        };

        const tick = () => {
            const node = ensure();
            if (node) node.textContent = formatDuration(elapsed());
        };

        ctx.cleanup(ui.registerTool({
            id: "session-timer",
            label: "Session timer",
            icon: "⏱",
            description: "How long this session has been running.",
            onClick: () => ctx.toast(`This session has been running for ${formatDuration(elapsed())}`),
        }));
        ctx.cleanup(settings.onChange(tick));
        ctx.cleanup(() => clock?.remove());
        ctx.interval(tick, 1000);
        tick();
        ctx.css(`
            .omniyap-timer{font:600 11px ui-monospace,SFMono-Regular,monospace;color:#9a9ca8;
                background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:6px;
                padding:2px 6px;margin-left:6px;font-variant-numeric:tabular-nums}
        `);
    },
});
