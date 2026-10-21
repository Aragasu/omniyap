import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";

const settings = definePluginSettings({
    everyoneToo: {
        type: OptionType.BOOLEAN,
        description: "Also highlight @everyone and @here.",
        default: true,
    },
    tint: {
        type: OptionType.STRING,
        description: "Background tint.",
        default: "rgba(139,57,253,.09)",
    },
});

export default definePlugin({
    name: "MentionHighlight",
    description: "Tints messages that mention you so they stand out while scrolling.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const decorate = ({ el, textEl }) => {
            if (!textEl) return;
            const me = store.me();
            const names = [me?.username, me?.display_name].filter(Boolean).map((name) => `@${name}`.toLowerCase());
            const text = textEl.innerText.toLowerCase();
            const mentioned = text.includes("@everyone") || text.includes("@here")
                ? settings.store.everyoneToo
                : names.some((name) => text.includes(name));
            el.classList.toggle("omniyap-mentioned", mentioned);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .msg.omniyap-mentioned{background:${settings.store.tint} !important;box-shadow:inset 3px 0 0 #8b39fd}
            .msg.omniyap-mentioned:hover{background:rgba(139,57,253,.13) !important}
        `);
    },
});
