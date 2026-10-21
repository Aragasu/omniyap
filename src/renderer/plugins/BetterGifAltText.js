import { definePlugin, messages } from "../core/api.js";

export default definePlugin({
    name: "BetterGifAltText",
    description: "Gives GIF attachments useful alt text and titles for screen readers and hover.",
    authors: [{ name: "OmniYap" }],
    tags: ["accessibility", "media"],

    start(ctx) {
        const decorate = ({ body }) => {
            if (!body) return;
            body.querySelectorAll("img, video").forEach((media) => {
                const src = media.currentSrc || media.src || "";
                if (!/\.(gif|webp|mp4|webm)(\?|$)/i.test(src)) return;
                if (media.getAttribute("data-omniyap-alt") === "1") return;
                const name = (() => {
                    try {
                        return decodeURIComponent(new URL(src).pathname.split("/").pop() || "");
                    } catch {
                        return "";
                    }
                })();
                const label = `GIF${name ? `: ${name.replace(/^r2-\d+-[a-z0-9]+\./i, "attachment.")}` : ""}`;
                media.setAttribute("alt", label);
                media.setAttribute("title", label);
                media.setAttribute("data-omniyap-alt", "1");
            });
        };
        ctx.cleanup(messages.decorate(decorate));
    },
});
