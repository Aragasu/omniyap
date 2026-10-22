import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "How message times are written.",
        options: [
            { label: "24-hour (14:05)", value: "24" },
            { label: "12-hour (2:05 PM)", value: "12" },
            { label: "Relative (3 min ago)", value: "relative" },
            { label: "ISO (2026-10-21 14:05)", value: "iso" },
        ],
        default: "24",
    },
    seconds: { type: OptionType.BOOLEAN, description: "Include seconds.", default: false },
    tooltip: { type: OptionType.BOOLEAN, description: "Also show the full date on hover.", default: true },
});

function timeOf(message) {
    const raw = message?.created_at ?? message?.timestamp ?? message?.createdAt ?? message?.at;
    const date = raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return date;
}

function format(date) {
    if (settings.store.format === "relative") {
        const seconds = Math.round((Date.now() - date.getTime()) / 1000);
        if (seconds < 45) return "just now";
        if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
        if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
        return `${Math.round(seconds / 86_400)} d ago`;
    }
    if (settings.store.format === "iso") {
        return date.toISOString().slice(0, 16).replace("T", " ");
    }
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: settings.store.seconds ? "2-digit" : undefined,
        hour12: settings.store.format === "12",
    });
}

export default definePlugin({
    name: "CustomTimestamps",
    description: "Formats message times as 24-hour, 12-hour, relative or ISO, with optional seconds.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const date = timeOf(message);
            if (!date) return;
            const head = el.querySelector(".msg-head");
            const candidates = el.querySelectorAll(".msg-time, .msg-head time, time[datetime], .msg-timestamp");
            let target = candidates.length ? candidates[candidates.length - 1] : null;
            if (!target) {
                if (!head) return;
                target = document.createElement("span");
                target.className = "omniyap-timestamp";
                head.appendChild(target);
            }
            const own = target.querySelector(".omniyap-timestamp");
            if (own) {
                own.textContent = format(date);
                if (settings.store.tooltip) own.title = date.toLocaleString();
                return;
            }
            if (target.dataset.omniyapTimestamp === "1") {
                target.textContent = format(date);
                return;
            }
            target.dataset.omniyapTimestamp = "1";
            const time = document.createElement("span");
            time.className = "omniyap-timestamp";
            time.textContent = format(date);
            if (settings.store.tooltip) time.title = date.toLocaleString();
            target.replaceChildren(time);
            target.classList.add("omniyap-time-custom");
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => {
            document.querySelectorAll("[data-omniyap-timestamp]").forEach((el) => {
                delete el.dataset.omniyapTimestamp;
            });
            messages.refresh();
        }));
        ctx.css(`
            .omniyap-timestamp{font:inherit;color:inherit;letter-spacing:0}
            .omniyap-time-custom{font-variant-numeric:tabular-nums}
        `);
    },
});
