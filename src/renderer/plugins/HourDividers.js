import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h, messageDate } from "./_shared.js";

const settings = definePluginSettings({
    dayToo: { type: OptionType.BOOLEAN, description: "Also start a new divider at midnight, with the date.", default: true },
    hour12: { type: OptionType.BOOLEAN, description: "Use 12-hour labels.", default: false },
});

function keyOf(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
}

function labelOf(date, newDay) {
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !!settings.store.hour12 });
    if (newDay) return `${date.toLocaleDateString()} · ${time}`;
    return time;
}

function previousRow(row) {
    let node = row.previousElementSibling;
    while (node && !node.classList.contains("msg")) node = node.previousElementSibling;
    return node;
}

export default definePlugin({
    name: "HourDividers",
    description: "Inserts a light time divider whenever the conversation crosses into a new hour, or a new day.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const date = messageDate(message);
            if (!date || Number.isNaN(date.getTime())) return;
            el.dataset.omniyapHour = keyOf(date);
            const previous = previousRow(el);
            if (!previous?.dataset?.omniyapHour) return;
            if (previous.dataset.omniyapHour === el.dataset.omniyapHour) return;
            if (el.previousElementSibling?.classList.contains("omniyap-hour")) return;

            const newDay = settings.store.dayToo && previous.dataset.omniyapHour.split("-").slice(0, 3).join("-") !== el.dataset.omniyapHour.split("-").slice(0, 3).join("-");
            el.before(h("div", { class: "omniyap-hour" },
                h("span", { class: "omniyap-hour-label" }, labelOf(date, newDay)),
            ));
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => {
            document.querySelectorAll(".omniyap-hour").forEach((node) => node.remove());
            messages.refresh();
        }));
        ctx.css(`
            .omniyap-hour{display:flex;align-items:center;gap:10px;margin:10px 0 4px;padding:0 8px;user-select:none}
            .omniyap-hour::before,.omniyap-hour::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.07)}
            .omniyap-hour-label{font:600 10px Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;
                color:#7c7f8a;white-space:nowrap;font-variant-numeric:tabular-nums}
        `);
    },
});
