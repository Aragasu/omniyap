import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    size: {
        type: OptionType.SLIDER,
        description: "Avatar size in pixels.",
        default: 16,
        min: 12,
        max: 24,
        step: 1,
    },
});

export default definePlugin({
    name: "MentionAvatars",
    description: "Shows a small avatar inside @mentions.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    settings,

    start(ctx) {
        const decorate = ({ textEl }) => {
            if (!textEl) return;
            textEl.querySelectorAll(".mention").forEach((mention) => {
                if (mention.querySelector(".omniyap-mention-avatar")) return;
                const name = mention.textContent.replace(/^@/, "").trim();
                const state = store.getState();
                const profiles = Object.values(state?.profiles || {});
                const profile = profiles.find((p) => p.username === name || p.display_name === name);
                if (!profile) return;
                const url = profile.avatar_url || profile.avatar;
                if (!url) return;
                mention.prepend(h("img", {
                    class: "omniyap-mention-avatar",
                    src: String(url),
                    alt: "",
                    style: { width: `${settings.store.size}px`, height: `${settings.store.size}px` },
                }));
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-mention-avatar{display:inline-block;border-radius:50%;vertical-align:-3px;margin-right:4px;object-fit:cover}
            .mention{display:inline-flex;align-items:center}
        `);
    },
});
