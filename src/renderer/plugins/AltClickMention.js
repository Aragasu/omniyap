import { definePlugin, definePluginSettings, OptionType, messages, store } from "../core/api.js";
import { insertIntoComposer, messageAuthorId } from "./_shared.js";

const settings = definePluginSettings({
    withReply: { type: OptionType.BOOLEAN, description: "Also start a reply to the message.", default: false },
});

export default definePlugin({
    name: "AltClickMention",
    description: "Alt-click a sender's name to drop an @mention into the composer, optionally replying to that message too.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "input"],
    settings,

    start(ctx) {
        const onClick = (event) => {
            if (!event.altKey || event.button !== 0) return;
            if (!(event.target instanceof Element)) return;
            const head = event.target.closest(".msg-head, .msg-author, .author");
            const row = head?.closest(messages.selector);
            if (!head || !row) return;
            const info = messages.info(row);
            const nameEl = head.querySelector(".name, .msg-author, [class*='name']") || head;
            const name = (nameEl.textContent || "").trim().split(/\s+/)[0];
            const userId = messageAuthorId(info.message);
            const handle = name || store.displayName?.(userId);
            if (!handle) return;
            event.preventDefault();
            event.stopPropagation();
            insertIntoComposer(`@${handle} `);
            if (settings.store.withReply) {
                row.querySelector('[aria-label*="Reply"], [title*="Reply"]')?.click?.();
            }
        };

        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));
    },
});
