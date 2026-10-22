import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, playMelody, formatDuration } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    work: { type: OptionType.SLIDER, description: "Focus length in minutes.", default: 25, min: 5, max: 90, step: 5 },
    rest: { type: OptionType.SLIDER, description: "Break length in minutes.", default: 5, min: 1, max: 30, step: 1 },
});

export default definePlugin({
    name: "PomodoroTimer",
    description: "A focus timer in OmniYap: work for 25 minutes, take a 5 minute break, with a chime and a cycle counter.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "productivity"],
    settings,

    start(ctx) {
        let phase = "work";
        let endsAt = 0;
        let remaining = 0;
        let running = false;
        let completed = 0;
        let interval = null;
        let display = null;

        const label = () => (phase === "work" ? "Focus" : "Break");

        const render = () => {
            if (!display?.isConnected) return;
            const left = running ? Math.max(0, endsAt - Date.now()) : remaining;
            display.querySelector(".omniyap-pomo-time").textContent = formatDuration(left);
            display.querySelector(".omniyap-pomo-phase").textContent = `${label()} · ${completed} completed`;
            display.querySelector(".omniyap-pomo-bar i").style.width = `${Math.max(0, Math.min(100, 100 - (left / (phase === "work" ? settings.store.work : settings.store.rest) / 60000) * 100))}%`;
        };

        const startInterval = () => {
            clearInterval(interval);
            interval = setInterval(() => {
                if (!running) return;
                if (Date.now() < endsAt) return render();
                running = false;
                playMelody([[659.25, 0], [880, 0.15], [1174.66, 0.3]], { volume: 0.13, duration: 0.28 });
                if (phase === "work") {
                    completed++;
                    phase = "rest";
                    ctx.toast(`Focus done. Take ${settings.store.rest} minutes.`, { type: "success", duration: 5000 });
                } else {
                    phase = "work";
                    ctx.toast("Break over. Back to focus.", { type: "info", duration: 4000 });
                }
                remaining = Number(phase === "work" ? settings.store.work : settings.store.rest) * 60_000;
                render();
            }, 250);
        };

        const open = () => {
            display = h("div", { class: "omniyap-pomo" },
                h("div", { class: "omniyap-pomo-phase" }, `${label()} · ${completed} completed`),
                h("div", { class: "omniyap-pomo-time" }, formatDuration(running ? Math.max(0, endsAt - Date.now()) : remaining || Number(settings.store.work) * 60_000)),
                h("div", { class: "omniyap-pomo-bar" }, h("i")),
            );
            const buttons = h("div", { class: "omniyap-pomo-actions" },
                h("button", {
                    class: "omniyap-btn primary",
                    onclick: () => {
                        if (running) {
                            running = false;
                            remaining = Math.max(0, endsAt - Date.now());
                        } else {
                            if (!remaining) remaining = Number(phase === "work" ? settings.store.work : settings.store.rest) * 60_000;
                            endsAt = Date.now() + remaining;
                            running = true;
                        }
                        render();
                        buttons.firstElementChild.textContent = running ? "Pause" : "Start";
                    },
                }, running ? "Pause" : "Start"),
                h("button", {
                    class: "omniyap-btn",
                    onclick: () => {
                        running = false;
                        remaining = Number(settings.store.work) * 60_000;
                        phase = "work";
                        render();
                        buttons.firstElementChild.textContent = "Start";
                    },
                }, "Reset"),
            );
            openModal({ title: "Pomodoro", subtitle: "Focus in blocks, rest in between", width: 460, body: h("div", {}, display, buttons) });
            if (!remaining) remaining = Number(settings.store.work) * 60_000;
            render();
        };

        startInterval();
        ctx.cleanup(() => clearInterval(interval));
        ctx.cleanup(ui.registerTool({
            id: "pomodoro",
            label: "Pomodoro timer",
            icon: "◕",
            description: "Focus and break cycles.",
            onClick: open,
        }));
        ctx.css(`
            .omniyap-pomo{display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0 4px}
            .omniyap-pomo-phase{font:600 11px Inter,system-ui,sans-serif;color:#9496a2;text-transform:uppercase;letter-spacing:.08em}
            .omniyap-pomo-time{font:700 52px ui-monospace,SFMono-Regular,monospace;color:#ececf1;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
            .omniyap-pomo-bar{width:100%;height:6px;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden}
            .omniyap-pomo-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8b39fd,#c48bff);transition:width .3s linear}
            .omniyap-pomo-actions{display:flex;gap:8px;margin-top:4px}
        `);
    },
});
