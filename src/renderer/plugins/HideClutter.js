import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    hideUpsells: { type: OptionType.BOOLEAN, description: "Hide upgrade and premium banners.", default: true },
    hideGiftButton: { type: OptionType.BOOLEAN, description: "Hide the gift button in the message box.", default: false },
    hideBoostBar: { type: OptionType.BOOLEAN, description: "Hide server boost bars.", default: true },
    hideTyping: { type: OptionType.BOOLEAN, description: "Hide the typing indicator line.", default: false },
    hideMembers: { type: OptionType.BOOLEAN, description: "Hide the member list.", default: false },
    hideDiscovery: { type: OptionType.BOOLEAN, description: "Hide server discovery and explore entries.", default: true },
});

export default definePlugin({
    name: "HideClutter",
    description: "Hides the parts of Yapper's interface you never use: upsells, gift buttons, boost bars, the typing line or the member list.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "utility"],
    settings,

    start(ctx) {
        const apply = () => {
            const rules = [];
            if (settings.store.hideUpsells) {
                rules.push(".nitro-upsell,.premium-banner,.upsell-card,.app-upsell,.upsell-banner,[data-omniyap-upsell]{display:none!important}");
            }
            if (settings.store.hideGiftButton) {
                rules.push(".composer .gift-btn,.composer .gift-button,.composer-tools .gift-btn{display:none!important}");
            }
            if (settings.store.hideBoostBar) {
                rules.push(".boost-bar,.server-boost-bar,.boost-banner{display:none!important}");
            }
            if (settings.store.hideTyping) rules.push(".typing-line,.typing-indicator{display:none!important}");
            if (settings.store.hideMembers) rules.push(".members-panel{display:none!important}");
            if (settings.store.hideDiscovery) rules.push(".discovery-card,.explore-servers,.server-discovery{display:none!important}");
            ctx.css(rules.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});
