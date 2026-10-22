import { definePlugin, definePluginSettings, OptionType, messages, store } from "../core/api.js";
import { getComposer, editMessage, messageAuthorId } from "./_shared.js";

const settings = definePluginSettings({
    arrowUp: { type: OptionType.BOOLEAN, description: "Press Up in an empty composer to edit your last message.", default: true },
    doubleClick: { type: OptionType.BOOLEAN, description: "Double-click one of your own messages to edit it.", default: false },
});

function ownRows() {
    return [...document.querySelectorAll(messages.selector)].filter((row) => {
        const info = messages.info(row);
        return messageAuthorId(info.message) === store.myId();
    });
}

export default definePlugin({
    name: "QuickEdit",
    description: "Fix a typo without hunting for the menu: press Up in an empty composer or double-click your message to edit it.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const onKey = async (event) => {
            if (!settings.store.arrowUp || event.key !== "ArrowUp") return;
            const composer = getComposer();
            if (!composer || event.target !== composer || composer.value.trim()) return;
            const rows = ownRows();
            if (!rows.length) return;
            event.preventDefault();
            event.stopPropagation();
            const ok = await editMessage(rows[rows.length - 1]);
            if (!ok) ctx.toast("Could not open the editor", { type: "error", duration: 1800 });
        };

        const onDoubleClick = async (event) => {
            if (!settings.store.doubleClick) return;
            if (!(event.target instanceof Element) || event.target.closest("a, button, img, video")) return;
            const row = event.target.closest(messages.selector);
            if (!row) return;
            const info = messages.info(row);
            if (messageAuthorId(info.message) !== store.myId()) return;
            event.preventDefault();
            event.stopPropagation();
            await editMessage(row);
        };

        document.addEventListener("keydown", onKey, true);
        document.addEventListener("dblclick", onDoubleClick, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.removeEventListener("dblclick", onDoubleClick, true);
        });
    },
});
