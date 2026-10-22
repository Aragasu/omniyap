import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, formatDuration } from "./_shared.js";

const settings = definePluginSettings({
    showInUserBar: {
        type: OptionType.BOOLEAN,
        description: "Show the timer in the bottom-left user bar.",
        default: true,
    },
    showInVoice: {
        type: OptionType.BOOLEAN,
        description: "Show the timer next to the voice channel header.",
        default: true,
    },
});

function inCall() {
    if (document.querySelector('[aria-label*="Disconnect"], [title*="Disconnect"], .voice-connected')) return true;
    const bar = document.querySelector(".user-bar");
    return !!bar?.querySelector(".voice-status, [class*='in-call'], [aria-label*='Leave call']");
}

export default definePlugin({
    name: "CallTimer",
    description: "Shows how long you have been in a voice call.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "utility"],
    settings,

    start(ctx) {
        let startedAt = null;
        let badge = null;
        let host = null;
        let tick = null;

        const mount = (parent, position = "append") => {
            if (parent === host && badge?.isConnected) return;
            badge?.remove();
            host = parent;
            if (!parent) return;
            badge = h("span", { class: "omniyap-call-timer", title: "Call duration" }, "0:00");
            if (position === "prepend") parent.prepend(badge);
            else parent.appendChild(badge);
        };

        const update = () => {
            if (!badge) return;
            const label = startedAt ? formatDuration(Date.now() - startedAt) : "0:00";
            if (badge.textContent !== label) badge.textContent = label;
        };

        const check = () => {
            const active = inCall();
            if (active && !startedAt) startedAt = Date.now();
            if (!active && startedAt) startedAt = null;

            const voiceHead = document.querySelector(".voice-header, .voice-people, .voice-channel-head");
            const bar = document.querySelector(".user-bar");
            if (settings.store.showInVoice && voiceHead) mount(voiceHead, "prepend");
            else if (settings.store.showInUserBar && bar) mount(bar);
            else {
                badge?.remove();
                badge = null;
                host = null;
            }
            if (!active && badge && badge.textContent !== "0:00") badge.textContent = "0:00";
        };

        ctx.onMutate(check);
        tick = ctx.interval(() => {
            check();
            update();
        }, 1000);
        check();

        ctx.css(`
            .omniyap-call-timer{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;
                background:rgba(48,164,108,.15);border:1px solid rgba(48,164,108,.35);color:#6ede9f;
                font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;margin:0 6px}
            .omniyap-call-timer::before{content:"";width:6px;height:6px;border-radius:50%;background:#30a46c}
        `);

        ctx.cleanup(() => {
            clearInterval(tick);
            badge?.remove();
        });
    },
});
