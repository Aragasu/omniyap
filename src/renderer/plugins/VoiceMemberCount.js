import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";

const settings = definePluginSettings({
    cap: { type: OptionType.SLIDER, description: "Show 99+ above this many people.", default: 20, min: 5, max: 99, step: 1 },
});

export default definePlugin({
    name: "VoiceMemberCount",
    description: "Shows how many people are in each voice channel right next to its name, without hovering.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "appearance"],
    settings,

    start(ctx) {
        const update = () => {
            document.querySelectorAll(".channel-row[data-nav-chan]").forEach((row) => {
                const id = row.getAttribute("data-nav-chan");
                const channel = id ? store.channel(id) : null;
                if (!channel) return;
                const type = String(channel.type || channel.kind || "").toLowerCase();
                const isVoice = type.includes("voice") || type.includes("call") || row.classList.contains("voice");
                const count = (store.getState()?.voiceMembers?.[id] || []).length;
                let badge = row.querySelector(".omniyap-vc-count");
                if (!isVoice || !count) {
                    badge?.remove();
                    return;
                }
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "omniyap-vc-count";
                    (row.querySelector(".channel-main .name") || row.querySelector(".channel-main"))?.appendChild(badge);
                }
                const cap = Math.max(5, Number(settings.store.cap) || 20);
                const label = count > cap ? `${cap}+` : String(count);
                if (badge.textContent !== label) badge.textContent = label;
                const title = `${count} in voice`;
                if (badge.title !== title) badge.title = title;
            });
        };

        ctx.onMutate(update);
        ctx.on("store:change", (state, previous) => {
            if (state.voiceMembers !== previous.voiceMembers) update();
        });
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-vc-count").forEach((node) => node.remove()));
        ctx.css(`
            .omniyap-vc-count{margin-left:5px;font:700 9.5px Inter,system-ui,sans-serif;color:#9fd8b4;
                background:rgba(59,165,93,.16);border:1px solid rgba(59,165,93,.32);border-radius:999px;padding:0 5px;
                vertical-align:middle}
        `);
        update();
    },
});
