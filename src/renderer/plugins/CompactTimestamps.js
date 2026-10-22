import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { messageDate } from "./_shared.js";

const settings = definePluginSettings({
    minutes: { type: OptionType.SLIDER, description: "Group times when messages are this close together.", default: 5, min: 1, max: 30, step: 1 },
    hideAvatars: { type: OptionType.BOOLEAN, description: "Also tuck away repeated avatars in a group.", default: false },
});

export default definePlugin({
    name: "CompactTimestamps",
    description: "Hides the timestamp on back-to-back messages from the same person, so a fast conversation stays readable.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const time = el.querySelector(".msg-time");
            if (!time) return;
            const previous = el.previousElementSibling;
            if (!previous?.matches?.(".msg")) {
                time.hidden = false;
                el.classList.remove("omniyap-compact-group");
                return;
            }
            const sameAuthor = previous.querySelector(".msg-author")?.textContent?.trim() === el.querySelector(".msg-author")?.textContent?.trim();
            const previousMessage = previous.getAttribute("data-omniyap-date");
            const currentDate = messageDate(message);
            let close = false;
            if (sameAuthor && previousMessage && currentDate) {
                close = currentDate.getTime() - Number(previousMessage) < Math.max(1, Number(settings.store.minutes) || 5) * 60_000;
            } else if (sameAuthor && !previousMessage && currentDate) {
                close = true;
            }
            time.hidden = close;
            el.classList.toggle("omniyap-compact-group", close);
            el.classList.toggle("omniyap-compact-avatar", close && settings.store.hideAvatars);
            if (currentDate) el.setAttribute("data-omniyap-date", String(currentDate.getTime()));
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => messages.refresh()));
        ctx.cleanup(() => document.querySelectorAll("[data-omniyap-date]").forEach((el) => el.removeAttribute("data-omniyap-date")));
        ctx.css(`
            .msg.omniyap-compact-group .msg-head{margin-top:-2px}
            .msg.omniyap-compact-avatar > .msg-gutter{visibility:hidden}
        `);
    },
});
