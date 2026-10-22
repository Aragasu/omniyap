import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, interceptSend, playMelody, formatDuration } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    sound: { type: OptionType.BOOLEAN, description: "Play a short chime when a timer ends.", default: true },
});

const timers = new Map();

function parseDuration(input) {
    const match = /^(\d{1,3})\s*(s|sec|m|min|h|hr|hour)?$/i.exec(String(input).trim());
    if (!match) return null;
    const unit = (match[2] || "m").toLowerCase();
    const value = Number(match[1]);
    if (!value) return null;
    const seconds = unit.startsWith("s") ? value : unit.startsWith("h") ? value * 3600 : value * 60;
    return Math.max(1, Math.min(86_400, seconds));
}

function openList() {
    const body = h("div");
    const render = () => {
        if (!timers.size) {
            body.replaceChildren(h("div", { class: "omniyap-empty" }, "No timers running. Type /timer 10m tea in the composer."));
            return;
        }
        body.replaceChildren(...[...timers.entries()].map(([id, timer]) => h("div", { class: "omniyap-row" },
            h("div", { class: "label" }, h("b", {}, timer.label), h("span", {}, `ends ${new Date(timer.endsAt).toLocaleTimeString()}`)),
            h("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
                h("span", { class: "omniyap-timer-left" }, formatDuration(timer.endsAt - Date.now())),
                h("button", { class: "omniyap-btn", onclick: () => { clearTimeout(timer.handle); timers.delete(id); render(); } }, "Cancel"),
            ),
        )));
    };
    openModal({
        title: "Timers",
        subtitle: "Local countdowns",
        width: 540,
        body,
        onMount: (element) => {
            render();
            const interval = setInterval(() => {
                if (!element.isConnected) return clearInterval(interval);
                render();
            }, 1000);
        },
    });
}

export default definePlugin({
    name: "CountdownTimer",
    description: "Type /timer 10m tea to start a local countdown; OmniYap chimes and tells you when it ends. /timers lists them.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "fun"],
    settings,

    start(ctx) {
        const startTimer = (seconds, label) => {
            const id = `${Date.now()}-${Math.random()}`;
            const handle = setTimeout(() => {
                timers.delete(id);
                ctx.toast(`⏳ Timer finished: ${label}`, { type: "success", duration: 6000 });
                if (settings.store.sound) playMelody([[659.25, 0], [880, 0.14], [1046.5, 0.28]], { volume: 0.12, duration: 0.25 });
            }, seconds * 1000);
            timers.set(id, { label, endsAt: Date.now() + seconds * 1000, handle });
            return seconds;
        };

        ctx.cleanup(interceptSend((text) => {
            const trimmed = String(text).trim();
            const match = /^\/timer\s+(\d{1,3}\s*[a-z]*)(?:\s+([\s\S]+))?$/i.exec(trimmed);
            if (!match) return text;
            const seconds = parseDuration(match[1]);
            if (!seconds) return text;
            const label = (match[2] || "timer").trim().slice(0, 80);
            startTimer(seconds, label);
            return `⏳ Timer set for **${formatDuration(seconds * 1000)}**: ${label}`;
        }));

        ctx.cleanup(ui.registerTool({
            id: "timers",
            label: "Timers",
            icon: "⏳",
            description: "Countdowns you have running.",
            onClick: openList,
        }));
        ctx.cleanup(() => {
            for (const timer of timers.values()) clearTimeout(timer.handle);
            timers.clear();
        });
        ctx.css(`.omniyap-timer-left{font:600 11px ui-monospace,monospace;color:#c48bff;font-variant-numeric:tabular-nums}`);
    },
});
