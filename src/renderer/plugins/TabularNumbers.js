import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    everywhere: { type: OptionType.BOOLEAN, description: "Apply to the whole app, not just times and badges.", default: false },
});

export default definePlugin({
    name: "TabularNumbers",
    description: "Uses fixed-width digits for timestamps, counters and badges so they stop shifting as numbers change.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "accessibility"],
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            root.toggleAttribute("data-omniyap-tabular-all", !!settings.store.everywhere);
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => root.removeAttribute("data-omniyap-tabular-all"));
        ctx.css(`
            .msg-time, .msg-timestamp, .omniyap-clock, .omniyap-timer, time, .unread-badge, .badge,
            .mention-count, .pill, .msg-edited{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}
            [data-omniyap-tabular-all] body{font-variant-numeric:tabular-nums}
        `);
    },
});
