import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    fontSize: { type: OptionType.SLIDER, description: "Message text size in percent.", default: 100, min: 80, max: 150, step: 5 },
    lineHeight: { type: OptionType.SLIDER, description: "Line height in percent.", default: 140, min: 110, max: 200, step: 5 },
    spacing: { type: OptionType.SLIDER, description: "Space between messages in pixels.", default: 8, min: 0, max: 28, step: 2 },
    maxWidth: { type: OptionType.NUMBER, description: "Maximum text width in pixels (0 keeps Yapper's width).", default: 0, min: 0, max: 2000, step: 20 },
    bubbles: { type: OptionType.BOOLEAN, description: "Draw messages as rounded bubbles.", default: false },
    separators: { type: OptionType.BOOLEAN, description: "Draw a hairline between messages.", default: false },
});

export default definePlugin({
    name: "MessageStyle",
    description: "Fine-tunes message text: size, line height, spacing, width, bubbles and separators.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat", "customisation"],
    settings,

    start(ctx) {
        const apply = () => {
            const s = settings.store;
            const fontSize = Math.max(80, Math.min(150, Number(s.fontSize) || 100));
            const lineHeight = Math.max(110, Math.min(200, Number(s.lineHeight) || 140));
            const spacing = Math.max(0, Math.min(28, Number(s.spacing) ?? 8));
            const maxWidth = Math.max(0, Math.min(2000, Number(s.maxWidth) || 0));

            const rules = [`.msg-text{font-size:${fontSize}%!important;line-height:${lineHeight / 100}!important}`];
            rules.push(`.msg{padding-top:${Math.round(spacing / 2)}px!important;padding-bottom:${Math.round(spacing / 2)}px!important}`);
            if (maxWidth) rules.push(`.msg-text{max-width:${maxWidth}px}`);
            if (s.bubbles) {
                rules.push(`
                    .msg-body{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.055);
                        border-radius:12px;padding:7px 11px;display:inline-block;max-width:100%}
                    .msg{margin:3px 0}
                    .msg.omniyap-state-mentioned .msg-body{background:rgba(139,57,253,.1)}
                `);
            }
            if (s.separators) rules.push(`.msg + .msg{border-top:1px solid rgba(255,255,255,.055)}`);
            ctx.css(rules.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});
