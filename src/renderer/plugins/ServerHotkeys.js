import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Ctrl+1…9 opens a server; Ctrl+0 opens direct messages.", default: true },
});

function servers() {
    return [...document.querySelectorAll("nav.rail .rail-item")].filter((item) => {
        const label = item.getAttribute("aria-label") || item.title || "";
        return label && !/create|discover|direct messages/i.test(label);
    });
}

export default definePlugin({
    name: "ServerHotkeys",
    description: "Jump between servers with Ctrl+1 to Ctrl+9, and back to direct messages with Ctrl+0.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "servers"],
    settings,

    start(ctx) {
        const onKey = (event) => {
            if (!settings.store.enabled || !event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
            if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]")) return;
            if (!/^[0-9]$/.test(event.key)) return;
            if (event.key === "0") {
                event.preventDefault();
                event.stopPropagation();
                document.querySelector('nav.rail button[aria-label="Direct messages"]')?.click();
                return;
            }
            const list = servers();
            const item = list[Number(event.key) - 1];
            if (!(item instanceof HTMLElement)) return;
            event.preventDefault();
            event.stopPropagation();
            item.click();
            ctx.toast(item.getAttribute("aria-label") || "Server", { duration: 900 });
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
