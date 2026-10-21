import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const STACKS = {
    system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    rounded: 'ui-rounded, "Nunito", "Varela Round", "Segoe UI", system-ui, sans-serif',
    serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", Cambria, serif',
    mono: 'ui-monospace, "Cascadia Code", Consolas, "SFMono-Regular", Menlo, monospace',
    readable: 'Verdana, Tahoma, "Trebuchet MS", sans-serif',
};

const cleanFamily = (value) => String(value || "").replace(/[;{}<>\\"]/g, "").trim().slice(0, 80);

const settings = definePluginSettings({
    preset: {
        type: OptionType.SELECT,
        description: "Font used by Yapper.",
        options: [
            { label: "Yapper's own", value: "default" },
            { label: "System", value: "system" },
            { label: "Rounded", value: "rounded" },
            { label: "Serif", value: "serif" },
            { label: "Monospace", value: "mono" },
            { label: "Easy to read", value: "readable" },
            { label: "My own (below)", value: "custom" },
        ],
        default: "default",
    },
    family: {
        type: OptionType.STRING,
        description: 'An installed font family for "My own". Imported font files from CustomFontFiles are available here too.',
        default: "",
        placeholder: "e.g. Inter",
    },
    size: {
        type: OptionType.SLIDER,
        description: "Text size in percent.",
        default: 100,
        min: 80,
        max: 130,
        step: 5,
    },
});

export default definePlugin({
    name: "CustomFont",
    description: "Changes Yapper's font and text size: presets, an installed family, or a font imported with CustomFontFiles.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "accessibility"],
    settings,

    start(ctx) {
        const apply = () => {
            const state = settings.store;
            let stack = "";
            if (state.preset === "custom") {
                const family = cleanFamily(state.family);
                if (family) stack = `"${family}", ${STACKS.system}`;
            } else if (STACKS[state.preset]) {
                stack = STACKS[state.preset];
            }

            const size = Math.max(80, Math.min(130, Number(state.size) || 100));
            const parts = [];
            if (stack) {
                parts.push(`:root{--omniyap-font:${stack}}`);
                parts.push(`body,button,input,textarea,select,.msg-text,.msg-author{font-family:${stack}!important}`);
            }
            if (size !== 100) {
                parts.push(`html{font-size:${size}%}`);
                parts.push(`.msg-text,.chat-row,.channel-row{font-size:${size}%}`);
            }
            ctx.css(parts.join("\n"));
        };

        apply();
        ctx.cleanup(settings.onChange(apply));
    },
});

export { STACKS, cleanFamily };
