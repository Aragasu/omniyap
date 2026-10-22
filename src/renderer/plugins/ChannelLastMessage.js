import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";

const settings = definePluginSettings({
    length: { type: OptionType.SLIDER, description: "Maximum characters of the preview.", default: 120, min: 40, max: 240, step: 20 },
    author: { type: OptionType.BOOLEAN, description: "Include who wrote it.", default: true },
});

export default definePlugin({
    name: "ChannelLastMessage",
    description: "Hovering a channel shows its most recent loaded message as a tooltip, so you know what you are opening.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "chat"],
    settings,

    start(ctx) {
        const onOver = (event) => {
            if (!(event.target instanceof Element)) return;
            const row = event.target.closest(".channel-row[data-nav-chan]");
            if (!row) return;
            const id = row.getAttribute("data-nav-chan");
            const list = id ? store.messages(id) : [];
            const last = list[list.length - 1];
            if (!last) return;
            const text = String(messages.content(last) || "").replace(/\s+/g, " ").trim();
            if (!text) return;
            const limit = Math.max(40, Math.min(240, Number(settings.store.length) || 120));
            const authorId = last.author_id || last.user_id || last.authorId || last.userId;
            const who = settings.store.author && authorId ? `${store.displayName(authorId)}: ` : "";
            const main = row.querySelector(".channel-main");
            if (main instanceof HTMLElement) main.title = `${who}${text.slice(0, limit)}${text.length > limit ? "…" : ""}`;
        };
        document.addEventListener("mouseover", onOver);
        ctx.cleanup(() => document.removeEventListener("mouseover", onOver));
    },
});
