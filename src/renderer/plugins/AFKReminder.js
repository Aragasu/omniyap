import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { playTone } from "./_shared.js";

const settings = definePluginSettings({
    minutes: { type: OptionType.SLIDER, description: "Idle minutes before the reminder.", default: 25, min: 5, max: 120, step: 5 },
    sound: { type: OptionType.BOOLEAN, description: "Play a soft tone with the reminder.", default: true },
    returnSummary: { type: OptionType.BOOLEAN, description: "Welcome you back with how long you were away.", default: true },
});

export default definePlugin({
    name: "AFKReminder",
    description: "Notices when you have been idle for a while, nudges you once, and welcomes you back with the time you were away.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "health"],
    settings,

    start(ctx) {
        let lastActive = Date.now();
        let reminded = false;

        const activity = () => {
            if (reminded && settings.store.returnSummary) {
                const away = Math.round((Date.now() - lastActive) / 60_000);
                if (away >= Math.max(5, Number(settings.store.minutes) || 25)) {
                    ctx.toast(`Welcome back — you were away for ${away} minutes`, { type: "info" });
                }
            }
            reminded = false;
            lastActive = Date.now();
        };

        for (const type of ["pointerdown", "keydown", "wheel", "focus"]) {
            window.addEventListener(type, activity, { passive: true });
        }

        ctx.interval(() => {
            const minutes = Math.max(5, Number(settings.store.minutes) || 25);
            const idle = (Date.now() - lastActive) / 60_000;
            if (idle < minutes || reminded) return;
            reminded = true;
            ctx.toast(`You have been idle for ${Math.round(idle)} minutes — stretch and drink some water`, { type: "info", duration: 6000 });
            if (settings.store.sound) playTone(523.25, 0.18, { volume: 0.08 });
        }, 30_000);

        ctx.cleanup(() => {
            for (const type of ["pointerdown", "keydown", "wheel", "focus"]) {
                window.removeEventListener(type, activity);
            }
        });
    },
});
