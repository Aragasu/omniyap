import { definePlugin, settings, store, patches, log } from "../core/api.js";
import plugins from "../core/plugins.js";
import OmniYap from "../core/state.js";

// Makes the client inspectable from the app's DevTools: window.omniyap.
export default definePlugin({
    name: "ConsoleShortcuts",
    description: "Exposes window.omniyap in DevTools: inspect and toggle plugins, read settings and Yapper's store, and copy diagnostics.",
    authors: [{ name: "OmniYap" }],
    tags: ["developer", "utility"],

    start(ctx) {
        // The mod's boot code already publishes a handle with ui/finder/themes on it; extend that
        // object instead of replacing it, and put it back when the plugin is turned off.
        const previous = window.omniyap && typeof window.omniyap === "object" ? window.omniyap : null;
        const api = {
            ...previous,
            version: OmniYap.version,
            store,
            settings,
            plugins: {
                list: () => plugins.list().map((plugin) => plugin.name),
                enabled: () => plugins.list().filter((plugin) => plugins.isEnabled(plugin.name)).map((plugin) => plugin.name),
                running: () => plugins.list().filter((plugin) => plugins.isRunning(plugin.name)).map((plugin) => plugin.name),
                toggle: (name) => {
                    const plugin = plugins.get(name);
                    if (!plugin) return `No plugin named ${name}`;
                    plugins.setEnabled(name, !plugins.isEnabled(name));
                    return `${name} is now ${plugins.isEnabled(name) ? "enabled" : "disabled"}`;
                },
                errors: () => Object.fromEntries([...plugins.errors].map(([name, error]) => [name, error?.message || String(error)])),
            },
            patchReport: () => patches.report(),
            async copyDiagnostics() {
                const report = {
                    version: OmniYap.version,
                    at: new Date().toISOString(),
                    plugins: api.plugins.errors(),
                    patches: api.patchReport(),
                    userAgent: navigator.userAgent,
                };
                await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
                return report;
            },
            help() {
                return [
                    "omniyap.plugins.list() / enabled() / running() / errors()",
                    "omniyap.plugins.toggle('PluginName')",
                    "omniyap.store.getState()",
                    "omniyap.settings.get('plugins.SomePlugin.option')",
                    "omniyap.copyDiagnostics()",
                ].join("\n");
            },
        };

        window.omniyap = api;
        log.info("window.omniyap is available (try omniyap.help())");

        ctx.cleanup(() => {
            if (window.omniyap !== api) return;
            if (previous) window.omniyap = previous;
            else delete window.omniyap;
        });
    },
});
