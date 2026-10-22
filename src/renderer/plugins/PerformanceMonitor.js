import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    showMemory: { type: OptionType.BOOLEAN, description: "Show JS heap usage when Chromium exposes it.", default: true },
    showState: { type: OptionType.BOOLEAN, description: "Show how many messages Yapper has loaded.", default: true },
});

export default definePlugin({
    name: "PerformanceMonitor",
    description: "A small live overlay with FPS, DOM node count, memory and loaded messages, for spotting what makes Yapper slow.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "development", "performance"],
    settings,

    start(ctx) {
        const box = h("div", { class: "omniyap-perf", title: "Performance monitor" });
        (document.body || document.documentElement).appendChild(box);
        let frames = 0;
        let last = performance.now();
        let fps = 0;
        let raf = null;

        const loop = (now) => {
            frames++;
            if (now - last >= 500) {
                fps = Math.round((frames * 1000) / (now - last));
                frames = 0;
                last = now;
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        const update = () => {
            const parts = [`${fps} fps`, `${document.querySelectorAll("*").length} nodes`];
            if (settings.store.showMemory && performance.memory) {
                parts.push(`${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`);
            }
            if (settings.store.showState) {
                const state = store.getState();
                const count = Object.values(state?.messages || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
                parts.push(`${count} msgs`);
            }
            const label = parts.join(" · ");
            if (box.textContent !== label) box.textContent = label;
            box.classList.toggle("warn", fps < 30);
        };

        ctx.interval(update, 1000);
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => {
            cancelAnimationFrame(raf);
            box.remove();
        });
        ctx.css(`
            .omniyap-perf{position:fixed;left:8px;bottom:8px;z-index:2147483000;background:rgba(16,16,22,.82);
                border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:3px 7px;pointer-events:none;
                font:600 9.5px ui-monospace,SFMono-Regular,monospace;color:#8e919e;font-variant-numeric:tabular-nums}
            .omniyap-perf.warn{color:#f0a75d;border-color:rgba(240,167,93,.3)}
        `);
        update();
    },
});
