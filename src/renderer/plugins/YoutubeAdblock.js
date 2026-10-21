import { definePlugin, settings as coreSettings } from "../core/api.js";

// The filtering itself happens in the main process (session.webRequest, toggled through the
// `omniyap.blockYouTubeAds` setting). This plugin is the switch, so the behaviour can be toggled
// like any other plugin and shows up in Diagnostics.
export default definePlugin({
    name: "YoutubeAdblock",
    description: "Filters ad requests in embedded YouTube players.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "privacy"],

    start(ctx) {
        coreSettings.set("omniyap.blockYouTubeAds", true);
        ctx.cleanup(() => coreSettings.set("omniyap.blockYouTubeAds", false));
        ctx.log.info("YouTube ad filtering enabled");
    },
});
