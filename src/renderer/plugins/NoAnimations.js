import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    keepAvatars: { type: OptionType.BOOLEAN, description: "Let animated avatars and emoji keep moving.", default: true },
    keepSpinners: { type: OptionType.BOOLEAN, description: "Keep loading spinners animated.", default: true },
    transitions: { type: OptionType.BOOLEAN, description: "Also remove hover and panel transitions.", default: true },
});

export default definePlugin({
    name: "NoAnimations",
    description: "Turns off decorative motion for a calmer, snappier interface while keeping loaders usable.",
    authors: [{ name: "OmniYap" }],
    tags: ["accessibility", "appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            const rules = [`
                .msg, .sidebar, .main-head, .modal, .omniyap-modal, .omniyap-tab, .omniyap-toast,
                .omniyap-card, .omniyap-btn { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
            `];
            if (settings.store.transitions) {
                // Deliberately not `*`: a universal transition rule makes every element transition every
                // property it ever changes, which pins the style system and drops the whole app to a
                // crawl on every new message. Only the pieces that actually animate are covered.
                rules.push(`
                    .msg, .msg-actions > *, .msg-body > *, .sidebar, .channel-row, .rail-item, .pick-row,
                    .main-head, .modal, .omniyap-modal, .omniyap-card, .omniyap-btn, .omniyap-tab,
                    .omniyap-toast, button, a, input, textarea { transition-duration: 0.001ms !important; }
                    html { scroll-behavior: auto !important; }
                `);
            }
            if (!settings.store.keepAvatars) {
                rules.push(`img.avatar-pic, img.emoji, img.avatar-deco { animation: none !important; }`);
            }
            if (!settings.store.keepSpinners) {
                rules.push(`[class*="spinner"], [class*="loading"], .omniyap-loading-quote { animation: none !important; }`);
            }
            ctx.css(rules.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});
