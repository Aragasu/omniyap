import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    offset: { type: OptionType.SLIDER, description: "UTC offset in hours (half hours allowed).", default: 0, min: -12, max: 14, step: 0.5 },
    label: { type: OptionType.STRING, description: "Prefix shown before the time.", default: "UTC" },
    hour12: { type: OptionType.BOOLEAN, description: "Use 12-hour time.", default: false },
});

function offsetLabel(offset) {
    const sign = offset < 0 ? "-" : "+";
    const absolute = Math.abs(offset);
    const hours = Math.floor(absolute);
    const minutes = Math.round((absolute - hours) * 60);
    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default definePlugin({
    name: "ServerClock",
    description: "Shows the time in another timezone in the header, so you always know what time it is for the rest of the server.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "appearance"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        let clock = null;

        const ensure = () => {
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head) return null;
            if (!clock || !clock.isConnected) {
                clock = h("span", { class: "omniyap-server-clock" });
                head.appendChild(clock);
            }
            return clock;
        };

        const tick = () => {
            const node = ensure();
            if (!node) return;
            const offset = Math.max(-12, Math.min(14, Number(settings.store.offset) || 0));
            const now = new Date(Date.now() + offset * 3_600_000);
            const time = now.toLocaleTimeString("en-GB", {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
                hour12: !!settings.store.hour12,
            });
            const prefix = String(settings.store.label || "UTC").trim() || "UTC";
            const text = `${prefix}${offsetLabel(offset)} ${time}`;
            if (node.textContent !== text) node.textContent = text;
            node.title = "Server time";
        };

        ctx.interval(tick, 1000);
        ctx.cleanup(settings.onChange(tick));
        ctx.cleanup(() => clock?.remove());
        tick();
        ctx.css(`
            .omniyap-server-clock{font:600 11px ui-monospace,SFMono-Regular,monospace;color:#9a9ca8;
                background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:6px;
                padding:2px 6px;margin-left:6px;white-space:nowrap;font-variant-numeric:tabular-nums}
        `);
    },
});
