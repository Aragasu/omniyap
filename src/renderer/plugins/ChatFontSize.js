import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    size: { type: OptionType.SLIDER, description: "Message text size in pixels.", default: 15, min: 11, max: 22, step: 1 },
    height: { type: OptionType.SLIDER, description: "Line height as a percentage of the font size.", default: 145, min: 120, max: 200, step: 5 },
});

export default definePlugin({
    name: "ChatFontSize",
    description: "Sets the size and line height of message text, so a busy chat reads the way you like it.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "accessibility"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        const root = document.documentElement;
        const apply = () => {
            const size = Math.max(11, Math.min(22, Number(settings.store.size) || 15));
            const height = Math.max(120, Math.min(200, Number(settings.store.height) || 145)) / 100;
            root.style.setProperty("--omniyap-chat-font", `${size}px`);
            root.style.setProperty("--omniyap-chat-line", String(height));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            root.style.removeProperty("--omniyap-chat-font");
            root.style.removeProperty("--omniyap-chat-line");
        });
        ctx.css(`
            .msg-text{font-size:var(--omniyap-chat-font)!important;line-height:var(--omniyap-chat-line)!important}
        `);
    },
});
