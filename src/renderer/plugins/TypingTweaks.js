import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    hideAvatars: {
        type: OptionType.BOOLEAN,
        description: "Hide avatars in the typing indicator.",
        default: false,
    },
    colorful: {
        type: OptionType.BOOLEAN,
        description: "Use Yapper's accent colour for the typing text.",
        default: true,
    },
    names: {
        type: OptionType.SELECT,
        description: "How many names to show.",
        options: [
            { label: "As many as fit", value: "all" },
            { label: "First three", value: "three" },
            { label: "Just the first", value: "one" },
        ],
        default: "all",
    },
});

export default definePlugin({
    name: "TypingTweaks",
    description: "Control the typing indicator's avatars, colour and number of names.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    settings,

    start(ctx) {
        const apply = () => {
            const mode = settings.store.names;
            ctx.css(`
                .typing img.avatar, .typing .avatar, .typing-people .avatar { display: ${settings.store.hideAvatars ? "none" : "inline-flex"} !important; }
                .typing { color: ${settings.store.colorful ? "var(--accent, #8b39fd)" : "inherit"} !important; }
                ${mode === "one" ? ".typing .typing-name:not(:first-child), .typing .typing-person:not(:first-child){display:none !important}" : ""}
                ${mode === "three" ? ".typing .typing-name:nth-child(n+4), .typing .typing-person:nth-child(n+4){display:none !important}" : ""}
                .typing span, .typing-dots span { animation-duration: 1.2s !important; }
            `);
        };
        apply();
        ctx.cleanup(settings.onChange(() => apply()));
    },
});
