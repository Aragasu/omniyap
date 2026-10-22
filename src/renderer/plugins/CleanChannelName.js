import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    stripEmoji: { type: OptionType.BOOLEAN, description: "Remove emoji and decorative symbols.", default: true },
    stripZeroWidth: { type: OptionType.BOOLEAN, description: "Remove zero-width and directional characters.", default: true },
    collapse: { type: OptionType.BOOLEAN, description: "Collapse repeated dashes, dots and spaces.", default: true },
});

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}]/gu;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

export function cleanName(text) {
    let value = String(text || "");
    if (settings.store.stripEmoji) value = value.replace(EMOJI, "");
    if (settings.store.stripZeroWidth) value = value.replace(INVISIBLE, "");
    if (settings.store.collapse) {
        value = value.replace(/[-_=~]{2,}/g, "-").replace(/\.{2,}/g, ".").replace(/\s{2,}/g, " ");
    }
    return value.trim() || String(text || "").trim();
}

export default definePlugin({
    name: "CleanChannelName",
    description: "Strips emoji, zero-width characters and repeated punctuation from the channel name in the header.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "utility"],
    settings,

    start(ctx) {
        const seen = new WeakMap();

        const apply = () => {
            document.querySelectorAll("header.main-head .title, header.main-head h1, .channel-head .title").forEach((el) => {
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                    if (node.parentElement?.closest(".omniyap-member-count, .omniyap-tabs, button")) continue;
                    const original = node.data;
                    if (!original.trim() || original.length < 2) continue;
                    const cleaned = cleanName(original);
                    if (!cleaned || cleaned === original) continue;
                    seen.set(node, original);
                    node.data = original.replace(original.trim(), cleaned);
                }
                const previous = seen.get(el);
                const label = el.textContent?.trim();
                if (label && previous !== label) {
                    seen.set(el, label);
                    el.setAttribute("title", label);
                }
            });
        };

        ctx.onMutate(apply);
        ctx.on("store:change", apply);
        ctx.cleanup(settings.onChange(apply));
        apply();
    },
});
