import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    noCookie: {
        type: OptionType.BOOLEAN,
        description: "Use youtube-nocookie.com.",
        default: true,
    },
    allowFullscreen: {
        type: OptionType.BOOLEAN,
        description: "Enable fullscreen and picture-in-picture on embeds.",
        default: true,
    },
});

function fix(iframe) {
    try {
        const url = new URL(iframe.src);
        if (!/(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname)) return;
        if (settings.store.noCookie) url.hostname = "www.youtube-nocookie.com";
        url.searchParams.set("rel", "0");
        url.searchParams.set("modestbranding", "1");
        if (url.toString() !== iframe.src) iframe.src = url.toString();
        if (settings.store.allowFullscreen) {
            iframe.setAttribute("allowfullscreen", "");
            iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
        }
    } catch {
        /* not a URL */
    }
}

export default definePlugin({
    name: "FixYoutubeEmbeds",
    description: "Repairs YouTube embeds: privacy-friendly host, no related videos, fullscreen allowed.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        const scan = () => document.querySelectorAll("iframe[src*='youtube']").forEach(fix);
        ctx.watch("iframe", fix);
        ctx.onMutate(scan);
        scan();
        ctx.interval(scan, 4000);
    },
});
