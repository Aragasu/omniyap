import { definePlugin, OmniYap, finder, store } from "../core/api.js";

export default definePlugin({
    name: "StartupTimings",
    description: "Measures how long Yapper, the mod loader and the store take to become ready.",
    authors: [{ name: "OmniYap" }],
    tags: ["developer", "utility"],

    start(ctx) {
        const started = OmniYap.startedAt;
        const timings = {
            bundle: 0,
            domReady: null,
            turboContext: null,
            storeReady: null,
            pluginsStarted: null,
        };
        OmniYap.timings = timings;
        timings.bundle = Math.round(performance.now());

        OmniYap.domReady.then(() => {
            timings.domReady = Math.round(performance.now());
            ctx.log.info("DOM ready", `${timings.domReady} ms`);
        });

        if (finder.ctx) timings.turboContext = Math.round(performance.now());
        else ctx.on("turbo:ready", () => {
            timings.turboContext = Math.round(performance.now());
            ctx.log.info("Turbopack context", `${timings.turboContext} ms`);
        });

        if (store.isReady) timings.storeReady = Math.round(performance.now());
        else ctx.on("store:ready", () => {
            timings.storeReady = Math.round(performance.now());
            ctx.log.info("Yapper store", `${timings.storeReady} ms`);
        });

        setTimeout(() => {
            timings.pluginsStarted = Math.round(performance.now());
            ctx.log.info("startup timings", timings);
        }, 1200);

        ctx.log.debug("bundle evaluated", `${Math.round(started - performance.timeOrigin)} ms after navigation start`);
    },
});
