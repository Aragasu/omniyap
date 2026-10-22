import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    seconds: { type: OptionType.BOOLEAN, description: "Show seconds.", default: false },
    date: { type: OptionType.BOOLEAN, description: "Show the date too.", default: false },
    hour12: { type: OptionType.BOOLEAN, description: "Use 12-hour time.", default: false },
});

export default definePlugin({
    name: "HeaderClock",
    description: "Puts a live clock in the chat header, with optional seconds and date, so you can check the time without leaving Yapper.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "appearance"],
    settings,

    start(ctx) {
        let clock = null;

        const ensure = () => {
            const head = document.querySelector("header.main-head");
            if (!head) return null;
            if (!clock || !clock.isConnected || clock.parentElement !== head) {
                clock = h("span", { class: "omniyap-clock", title: "Current time" });
                const members = [...head.querySelectorAll("button")].find((button) => (button.getAttribute("aria-label") || "").includes("Members"));
                if (members) members.before(clock);
                else head.appendChild(clock);
            }
            return clock;
        };

        const tick = () => {
            const node = ensure();
            if (!node) return;
            const now = new Date();
            const time = now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: settings.store.seconds ? "2-digit" : undefined,
                hour12: !!settings.store.hour12,
            });
            const date = settings.store.date ? now.toLocaleDateString([], { month: "short", day: "numeric" }) : "";
            const label = date ? `${date} · ${time}` : time;
            if (node.textContent !== label) node.textContent = label;
        };

        ctx.onMutate(ensure);
        ctx.interval(tick, 1000);
        ctx.cleanup(settings.onChange(tick));
        ctx.cleanup(() => clock?.remove());
        ctx.css(`
            .omniyap-clock{font:600 11.5px ui-monospace,SFMono-Regular,monospace;color:#8f92a0;
                background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);border-radius:6px;
                padding:3px 7px;white-space:nowrap;margin-right:4px;font-variant-numeric:tabular-nums;user-select:none}
            .omniyap-clock:hover{color:#c3c5cd}
        `);
        tick();
    },
});
