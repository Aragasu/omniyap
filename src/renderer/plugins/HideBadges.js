import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    badges: { type: OptionType.BOOLEAN, description: "Hide badges beside names in chat.", default: true },
    verified: { type: OptionType.BOOLEAN, description: "Hide the verified tick in chat.", default: false },
    plus: { type: OptionType.BOOLEAN, description: "Hide the Plus badge in chat.", default: true },
    tags: { type: OptionType.BOOLEAN, description: "Hide small tags beside names in chat.", default: true },
    tidyProfiles: { type: OptionType.BOOLEAN, description: "Give the badges on profile cards a tidier layout.", default: true },
});

export default definePlugin({
    name: "HideBadges",
    description: "Removes the badge clutter beside names in chat and tidies up the badges on profile cards.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],
    settings,

    start(ctx) {
        const apply = () => {
            const rules = [];
            if (settings.store.badges) rules.push(".msg-head .ubadge{display:none!important}");
            if (settings.store.verified) rules.push(".msg-head .verified-badge{display:none!important}");
            if (settings.store.plus) rules.push(".msg-head .plus-badge{display:none!important}");
            if (settings.store.tags) rules.push(".msg-head .stag{display:none!important}");
            if (settings.store.tidyProfiles) {
                rules.push(`
                    .pc2-badges{gap:6px;margin:6px 0 8px}
                    .pc2-badges .ubadge.lg{margin:0;padding:5px 11px;border-radius:999px;font-weight:600;
                        box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 2px 8px rgba(0,0,0,.18);
                        transition:transform .15s ease,background .15s ease}
                    .pc2-badges .ubadge.lg:hover{transform:translateY(-1px);background:var(--bg-hover,rgba(255,255,255,.08))}
                    @media (prefers-reduced-motion:reduce){
                        .pc2-badges .ubadge.lg{transition:none}
                        .pc2-badges .ubadge.lg:hover{transform:none}
                    }
                `);
            }
            ctx.css(rules.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});
