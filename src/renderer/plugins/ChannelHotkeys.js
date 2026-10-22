import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Alt+1…9 opens the nth channel in the sidebar.", default: true },
});

const rows = () => [...document.querySelectorAll(".sidebar .channel-row[data-nav-chan]")];

export default definePlugin({
    name: "ChannelHotkeys",
    description: "Opens the first nine channels of a server with Alt+1 to Alt+9, without touching the mouse.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "servers"],
    settings,

    start(ctx) {
        const onKey = (event) => {
            if (!settings.store.enabled || !event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) return;
            if (!/^[1-9]$/.test(event.key)) return;
            if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]")) return;
            const row = rows()[Number(event.key) - 1];
            const button = row?.querySelector(".channel-main");
            if (!(button instanceof HTMLElement)) return;
            event.preventDefault();
            event.stopPropagation();
            button.click();
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
