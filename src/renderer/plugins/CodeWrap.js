import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    inline: { type: OptionType.BOOLEAN, description: "Also wrap inline code.", default: false },
    scrollbar: { type: OptionType.BOOLEAN, description: "Keep a horizontal scrollbar when wrapping is off.", default: true },
});

export default definePlugin({
    name: "CodeWrap",
    description: "Wraps long lines in code blocks instead of hiding them behind a horizontal scrollbar.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance", "developer"],
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            root.dataset.omniyapCodeWrap = settings.store.inline ? "inline" : "block";
            root.dataset.omniyapCodeScroll = settings.store.scrollbar ? "1" : "0";
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            delete root.dataset.omniyapCodeWrap;
            delete root.dataset.omniyapCodeScroll;
        });
        ctx.css(`
            [data-omniyap-code-wrap] .msg-text pre, [data-omniyap-code-wrap] .msg-text pre code{
                white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}
            [data-omniyap-code-scroll="0"] .msg-text pre{overflow-x:hidden!important}
            [data-omniyap-code-wrap="inline"] .msg-text code:not(pre code){white-space:normal!important;overflow-wrap:anywhere!important}
        `);
    },
});
