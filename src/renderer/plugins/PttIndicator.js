import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    text: { type: OptionType.STRING, description: "Text shown while transmitting.", default: "Talking" },
});

function talking(state) {
    const raw = state?.pttTalking;
    if (raw === true) return true;
    if (raw && typeof raw === "object") return Object.keys(raw).length > 0;
    return false;
}

export default definePlugin({
    name: "PttIndicator",
    description: "Shows a clear on-screen badge while your push-to-talk key is transmitting, so you never talk into the void.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "accessibility"],
    settings,

    start(ctx) {
        let badge = null;

        const update = () => {
            const state = store.getState();
            const active = talking(state) && !!(state?.voice?.channelId || state?.voiceChannelId);
            if (!active) {
                badge?.remove();
                badge = null;
                return;
            }
            if (!badge || !badge.isConnected) {
                badge = h("div", { class: "omniyap-ptt", role: "status", "aria-live": "polite" },
                    h("span", { class: "omniyap-ptt-dot" }),
                    String(settings.store.text || "Talking"),
                );
                document.body.appendChild(badge);
            }
        };

        ctx.on("store:change", (state, previous) => {
            if (state.pttTalking !== previous.pttTalking || state.voice !== previous.voice) update();
        });
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => badge?.remove());
        ctx.css(`
            .omniyap-ptt{position:fixed;bottom:74px;left:50%;transform:translateX(-50%);z-index:2147483000;
                display:flex;align-items:center;gap:7px;background:rgba(24,12,36,.94);border:1px solid #8b39fd;
                color:#f0e6ff;font:700 12px Inter,system-ui,sans-serif;border-radius:999px;padding:7px 14px;
                box-shadow:0 8px 28px rgba(0,0,0,.45);pointer-events:none}
            .omniyap-ptt-dot{width:9px;height:9px;border-radius:50%;background:#c48bff;animation:omniyap-ptt-pulse 1s infinite}
            @keyframes omniyap-ptt-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(196,139,255,.6)}50%{opacity:.7;box-shadow:0 0 0 6px rgba(196,139,255,0)}}
        `);
        update();
    },
});
