import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    amount: { type: OptionType.SLIDER, description: "Blur strength in pixels.", default: 4, min: 1, max: 10, step: 1 },
    members: { type: OptionType.BOOLEAN, description: "Also blur the member list and friends.", default: true },
    own: { type: OptionType.BOOLEAN, description: "Also blur your own name.", default: false },
});

export default definePlugin({
    name: "BlurNames",
    description: "Blurs people's names until you hover them, handy for screenshots and streaming without hiding the conversation.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            const amount = Math.max(1, Math.min(10, Number(settings.store.amount) || 4));
            document.documentElement.style.setProperty("--omniyap-name-blur", `${amount}px`);
            document.documentElement.classList.toggle("omniyap-blur-members", !!settings.store.members);
            document.documentElement.classList.toggle("omniyap-blur-own", !!settings.store.own);
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            document.documentElement.style.removeProperty("--omniyap-name-blur");
            document.documentElement.classList.remove("omniyap-blur-members", "omniyap-blur-own");
        });
        apply();
        ctx.css(`
            .msg-author{filter:blur(var(--omniyap-name-blur,4px));transition:filter .12s ease}
            .msg-author:hover{filter:blur(0)}
            .omniyap-blur-members .pick-row-name,.omniyap-blur-members .friend-name,
            .omniyap-blur-members .reply-author{filter:blur(var(--omniyap-name-blur,4px));transition:filter .12s ease}
            .omniyap-blur-members .pick-row:hover .pick-row-name,.omniyap-blur-members .friend-row:hover .friend-name,
            .omniyap-blur-members .reply-preview:hover .reply-author{filter:blur(0)}
            .omniyap-blur-own .user-bar .uname{filter:blur(var(--omniyap-name-blur,4px))}
            .omniyap-blur-own .user-bar .who:hover .uname{filter:blur(0)}
        `);
    },
});
