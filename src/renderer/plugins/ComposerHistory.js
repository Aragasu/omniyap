import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { getComposer, setNativeValue, messageAuthorId } from "./_shared.js";

const settings = definePluginSettings({
    size: { type: OptionType.SLIDER, description: "How many previous messages to remember per channel.", default: 30, min: 5, max: 100, step: 5 },
});

export default definePlugin({
    name: "ComposerHistory",
    description: "Press Up in an empty composer to cycle through your recent messages in that channel, and Down to come back.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const history = new Map();
        const lastId = new Map();
        let index = -1;
        let draft = null;

        const listFor = (channelId) => {
            if (!history.has(channelId)) history.set(channelId, []);
            return history.get(channelId);
        };

        const remember = (channelId, text) => {
            if (!channelId || !text) return;
            const list = listFor(channelId);
            if (list[list.length - 1] === text) return;
            list.push(text);
            const limit = Math.max(5, Math.min(100, Number(settings.store.size) || 30));
            while (list.length > limit) list.shift();
        };

        ctx.on("store:change", (state, previous) => {
            const channelId = state.activeChannelId;
            const now = state.messages?.[channelId];
            const before = previous.messages?.[channelId];
            if (!Array.isArray(now) || now === before) return;
            for (let i = now.length - 1; i >= 0; i--) {
                const message = now[i];
                if (!message || messageAuthorId(message) !== state.userId) continue;
                if (lastId.get(channelId) === message.id) break;
                lastId.set(channelId, message.id);
                remember(channelId, messages.content(message));
                break;
            }
        });

        const reset = () => {
            index = -1;
            draft = null;
        };

        const onInput = () => {
            reset();
        };

        const onKey = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            const list = listFor(store.activeChannelId());
            if (!list.length) return;
            const caret = composer.selectionStart ?? 0;

            if (event.key === "ArrowUp") {
                if (caret !== 0 || (composer.selectionEnd ?? 0) !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                if (index === -1) {
                    draft = composer.value;
                    index = 0;
                } else {
                    index = Math.min(list.length - 1, index + 1);
                }
                const text = list[list.length - 1 - index];
                setNativeValue(composer, text);
                composer.setSelectionRange?.(text.length, text.length);
            } else {
                if (index === -1) return;
                if (caret !== composer.value.length) return;
                event.preventDefault();
                event.stopPropagation();
                index--;
                if (index < 0) {
                    const text = draft ?? "";
                    index = -1;
                    draft = null;
                    setNativeValue(composer, text);
                    composer.setSelectionRange?.(text.length, text.length);
                } else {
                    const text = list[list.length - 1 - index];
                    setNativeValue(composer, text);
                    composer.setSelectionRange?.(text.length, text.length);
                }
            }
        };

        document.addEventListener("keydown", onKey, true);
        document.addEventListener("input", onInput, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.removeEventListener("input", onInput, true);
        });
    },
});
