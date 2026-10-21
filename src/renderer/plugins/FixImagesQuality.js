import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
    original: {
        type: OptionType.BOOLEAN,
        description: "Rewrite image URLs to request the original file.",
        default: true,
    },
});

const RESIZE_PARAMS = ["w", "width", "h", "height", "q", "quality", "fit", "resize", "format"];

function originalUrl(raw) {
    try {
        const url = new URL(raw);
        let changed = false;
        for (const key of RESIZE_PARAMS) {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                changed = true;
            }
        }
        if (!changed) return raw;
        return url.toString();
    } catch {
        return raw;
    }
}

export default definePlugin({
    name: "FixImagesQuality",
    description: "Loads images at their original quality instead of a resized thumbnail.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        const decorate = ({ body }) => {
            if (!body || !settings.store.original) return;
            body.querySelectorAll("img").forEach((img) => {
                if (img.classList.contains("emoji") || img.closest(".avatar")) return;
                const current = img.currentSrc || img.src;
                if (!current || img.dataset.omniyapOriginal === "1") return;
                const next = originalUrl(current);
                if (next !== current) {
                    img.dataset.omniyapOriginal = "1";
                    img.src = next;
                }
            });
        };
        ctx.cleanup(messages.decorate(decorate));
    },
});
