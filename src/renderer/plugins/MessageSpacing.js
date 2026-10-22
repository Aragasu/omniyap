import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    gap: { type: OptionType.SLIDER, description: "Space between messages in pixels.", default: 4, min: 0, max: 20, step: 1 },
    grouped: { type: OptionType.BOOLEAN, description: "Keep consecutive messages from the same author tight together.", default: true },
});

export default definePlugin({
    name: "MessageSpacing",
    description: "Tightens or loosens the gap between messages, with an option to keep grouped messages closer.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            const gap = Math.max(0, Math.min(20, Number(settings.store.gap) || 0));
            root.style.setProperty("--omniyap-msg-gap", `${gap}px`);
            root.style.setProperty("--omniyap-msg-group-gap", `${Math.round(gap / 2)}px`);
            root.dataset.omniyapGrouped = settings.store.grouped ? "1" : "0";
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            root.style.removeProperty("--omniyap-msg-gap");
            root.style.removeProperty("--omniyap-msg-group-gap");
            delete root.dataset.omniyapGrouped;
        });
        ctx.css(`
            .msg + .msg{margin-top:var(--omniyap-msg-gap)!important}
            [data-omniyap-grouped="1"] .msg.msg-group-start + .msg:not(.msg-group-start){margin-top:var(--omniyap-msg-group-gap)!important}
        `);
    },
});
