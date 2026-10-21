import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    inChat: { type: OptionType.BOOLEAN, description: "Hide the SYSTEM tag beside names in chat.", default: true },
    inProfiles: { type: OptionType.BOOLEAN, description: "Hide it on profile cards as well.", default: false },
});

export default definePlugin({
    name: "NoSystemBadge",
    description: "Hides the SYSTEM tag that Yapper shows next to official accounts.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    settings,

    start(ctx) {
        const apply = () => {
            const rules = [];
            if (settings.store.inChat) {
                rules.push(".msg-head .sys-badge,.msg-head .system-badge,.msg-head .system-tag,.msg-head .stag.system{display:none!important}");
            }
            if (settings.store.inProfiles) {
                rules.push(".pc2-badges .sys-badge,.pc2-badges .system-badge,.pc2-badges .system-tag{display:none!important}");
            }
            ctx.css(rules.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});
