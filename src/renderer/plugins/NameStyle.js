import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    weight: {
        type: OptionType.SELECT,
        description: "Name weight.",
        options: [
            { label: "Yapper's own", value: "" },
            { label: "Normal", value: "400" },
            { label: "Medium", value: "500" },
            { label: "Semibold", value: "600" },
            { label: "Bold", value: "700" },
            { label: "Extra bold", value: "800" },
        ],
        default: "600",
    },
    size: { type: OptionType.SLIDER, description: "Name size in percent.", default: 100, min: 80, max: 140, step: 5 },
    letterSpacing: { type: OptionType.SLIDER, description: "Letter spacing in hundredths of an em.", default: 0, min: -5, max: 12, step: 1 },
    uppercase: { type: OptionType.BOOLEAN, description: "Write names in capitals.", default: false },
    glow: { type: OptionType.BOOLEAN, description: "Add a soft purple glow.", default: false },
    everywhere: { type: OptionType.BOOLEAN, description: "Also style names in the member list and profiles.", default: true },
});

export default definePlugin({
    name: "NameStyle",
    description: "Styles the names in chat and member lists: weight, size, spacing, capitals and a soft glow.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat", "customisation"],
    settings,

    start(ctx) {
        const apply = () => {
            const s = settings.store;
            const selectors = [".msg-author"];
            if (s.everywhere) selectors.push(".members-panel .name", ".pc2-head .name", ".chat-row .name");
            const rules = [];
            const declarations = [];
            if (s.weight) declarations.push(`font-weight:${s.weight}!important`);
            if (Number(s.size) !== 100) declarations.push(`font-size:${Number(s.size)}%!important`);
            const tracking = Number(s.letterSpacing) || 0;
            if (tracking) declarations.push(`letter-spacing:${(tracking / 100).toFixed(2)}em`);
            if (s.uppercase) declarations.push("text-transform:uppercase");
            if (s.glow) declarations.push("text-shadow:0 0 12px rgba(139,57,253,.55)");
            if (declarations.length) rules.push(`${selectors.join(",")}{${declarations.join(";")}}`);
            ctx.css(rules.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});
