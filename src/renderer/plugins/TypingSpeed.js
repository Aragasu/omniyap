import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, getComposer } from "./_shared.js";

const settings = definePluginSettings({
    showWhenIdle: { type: OptionType.BOOLEAN, description: "Keep the last speed visible for a few seconds after you stop.", default: true },
});

export default definePlugin({
    name: "TypingSpeed",
    description: "Shows your live typing speed in words per minute and the characters typed while you write a message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let badge = null;
        let previous = 0;
        let keystrokes = [];
        let hideTimer = null;

        const ensure = () => {
            const composer = getComposer();
            if (!composer) return null;
            const box = composer.closest(".composer-box") || composer.parentElement;
            if (!box) return null;
            if (!badge || !badge.isConnected || badge.parentElement !== box) {
                badge = h("span", { class: "omniyap-wpm", title: "Typing speed" });
                box.appendChild(badge);
            }
            return badge;
        };

        const onInput = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const length = composer.value.length;
            const delta = length - previous;
            previous = length;
            const now = Date.now();
            if (delta <= 0) {
                if (!length) keystrokes = [];
                return;
            }
            keystrokes.push({ at: now, count: delta });
            keystrokes = keystrokes.filter((entry) => now - entry.at < 7000);
            const total = keystrokes.reduce((sum, entry) => sum + entry.count, 0);
            const span = Math.max(1, (now - keystrokes[0].at) / 1000);
            const wpm = Math.round((total / 5) / (span / 60));
            const el = ensure();
            if (!el) return;
            el.textContent = `${wpm} wpm · ${total} chars`;
            el.hidden = false;
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                if (!settings.store.showWhenIdle) {
                    if (el) el.hidden = true;
                } else if (el) {
                    el.textContent = `${wpm} wpm`;
                }
            }, 3000);
        };

        document.addEventListener("input", onInput, true);
        ctx.cleanup(() => {
            document.removeEventListener("input", onInput, true);
            clearTimeout(hideTimer);
            badge?.remove();
        });
        ctx.css(`
            .composer-box .omniyap-wpm{position:absolute;right:10px;bottom:5px;font:600 9.5px Inter,system-ui,sans-serif;
                color:#7b7e8b;background:rgba(0,0,0,.25);border-radius:5px;padding:1px 5px;pointer-events:none;
                font-variant-numeric:tabular-nums;z-index:2}
        `);
        const composer = getComposer();
        if (composer) previous = composer.value.length;
    },
});
