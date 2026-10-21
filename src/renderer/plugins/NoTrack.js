import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    blockBeacon: {
        type: OptionType.BOOLEAN,
        description: "Disable navigator.sendBeacon.",
        default: true,
    },
    blockFetch: {
        type: OptionType.BOOLEAN,
        description: "Block requests to known analytics hosts.",
        default: true,
    },
});

const TRACKERS = [
    "google-analytics.com", "googletagmanager.com", "posthog.com", "sentry.io",
    "segment.io", "segment.com", "mixpanel.com", "amplitude.com", "hotjar.com",
    "fullstory.com", "clarity.ms", "vercel-insights.com", "vercel-scripts.com",
];

export default definePlugin({
    name: "NoTrack",
    description: "Blocks analytics beacons and third-party tracking requests.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy"],

    settings,

    start(ctx) {
        const originals = [];

        if (settings.store.blockBeacon && navigator.sendBeacon) {
            const original = navigator.sendBeacon.bind(navigator);
            originals.push(() => (navigator.sendBeacon = original));
            navigator.sendBeacon = (url, data) => {
                const text = String(url);
                if (TRACKERS.some((host) => text.includes(host))) {
                    ctx.log.debug("blocked beacon", text);
                    return true;
                }
                return original(url, data);
            };
        }

        if (settings.store.blockFetch) {
            const originalFetch = window.fetch;
            originals.push(() => (window.fetch = originalFetch));
            window.fetch = function (input, init) {
                const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
                if (TRACKERS.some((host) => url.includes(host))) {
                    ctx.log.debug("blocked request", url);
                    return Promise.resolve(new Response("", { status: 204 }));
                }
                return originalFetch.call(this, input, init);
            };
        }

        ctx.css("/* NoTrack active */");
        ctx.cleanup(() => originals.reverse().forEach((restore) => restore()));
    },
});
