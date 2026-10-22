import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { getComposer } from "./_shared.js";

const settings = definePluginSettings({
    seconds: { type: OptionType.SLIDER, description: "How long to block an identical message.", default: 8, min: 2, max: 60, step: 1 },
    notify: { type: OptionType.BOOLEAN, description: "Show a toast when a duplicate is blocked.", default: true },
});

export default definePlugin({
    name: "NoDuplicateSends",
    description: "Stops the same message being sent twice in a row after a laggy Enter or a double click, within a time window you choose.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const last = new Map();

        const activeChannel = () => store.activeChannelId() || "dm";

        const check = (event) => {
            const composer = getComposer();
            if (!composer) return false;
            const target = event.target instanceof Element ? event.target : null;
            const isSendButton = target?.closest(".send-btn, button[aria-label='Send'], button[type='submit']");
            const isEnter = event.type === "keydown" && event.key === "Enter" && !event.shiftKey;
            if (!isSendButton && !isEnter) return false;
            const text = composer.value.trim();
            if (!text) return false;

            const key = activeChannel();
            const previous = last.get(key);
            const windowMs = Math.max(2, Number(settings.store.seconds) || 8) * 1000;
            if (previous && previous.text === text && Date.now() - previous.at < windowMs) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
                if (settings.store.notify) ctx.toast("That message was just sent", { type: "error", duration: 2000 });
                return true;
            }
            last.set(key, { text, at: Date.now() });
            return false;
        };

        document.addEventListener("keydown", check, true);
        document.addEventListener("click", check, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", check, true);
            document.removeEventListener("click", check, true);
        });
    },
});
