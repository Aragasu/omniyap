import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    doubleClick: {
        type: OptionType.BOOLEAN,
        description: "Double-click a message to reply to it.",
        default: true,
    },
    shortcut: {
        type: OptionType.BOOLEAN,
        description: "Press R while hovering a message to reply.",
        default: false,
    },
});

export default definePlugin({
    name: "QuickReply",
    description: "Reply without reaching for the hover menu: double-click, or press R.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const reply = (row) => {
            const button = row.querySelector('.msg-actions button[aria-label="Reply"], .msg-actions button[title="Reply"]');
            if (button instanceof HTMLElement) {
                button.click();
                return true;
            }
            return false;
        };

        const onDoubleClick = (event) => {
            if (!settings.store.doubleClick) return;
            if (event.target instanceof Element && event.target.closest("a, button, img, video, input, textarea")) return;
            const row = event.target instanceof Element ? event.target.closest(".msg[data-message-id]") : null;
            if (!row) return;
            if (reply(row)) event.preventDefault();
        };

        const onKey = (event) => {
            if (!settings.store.shortcut || event.key.toLowerCase() !== "r" || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]")) return;
            const row = document.querySelector(".msg:hover");
            if (row && reply(row)) event.preventDefault();
        };

        document.addEventListener("dblclick", onDoubleClick, true);
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("dblclick", onDoubleClick, true);
            document.removeEventListener("keydown", onKey, true);
        });
    },
});
