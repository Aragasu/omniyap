import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
    button: { type: OptionType.STRING, description: "Extra selector used to find the reply control.", default: "" },
});

export default definePlugin({
    name: "ShiftClickReply",
    description: "Shift-click anywhere in a message to start a reply to it, instead of hunting for the small reply button.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "input"],
    settings,

    start(ctx) {
        const onClick = (event) => {
            if (!event.shiftKey || event.button !== 0) return;
            if (!(event.target instanceof Element)) return;
            if (event.target.closest("a, input, textarea, button, [role='button']")) return;
            const row = event.target.closest(messages.selector);
            if (!row) return;
            const selectors = [
                '[aria-label*="Reply" i]',
                '[title*="Reply" i]',
                '[data-testid*="reply" i]',
                ".msg-actions [class*='reply']",
                settings.store.button,
            ].filter(Boolean);
            const control = selectors.map((selector) => row.querySelector(selector)).find(Boolean);
            if (!control) return;
            const selection = window.getSelection?.()?.toString().trim();
            if (selection) return;
            event.preventDefault();
            event.stopPropagation();
            control.click();
        };

        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));
    },
});
