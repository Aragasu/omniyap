import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, parseList } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    patterns: {
        type: OptionType.STRING,
        description: "Hide console lines containing these (comma separated, case-insensitive).",
        default: "Download the React DevTools, Electron Security Warning, [HMR], Fast Refresh, React DevTools",
        multiline: true,
    },
    quietWarnings: { type: OptionType.BOOLEAN, description: "Also filter console.warn lines.", default: false },
});

export default definePlugin({
    name: "ConsoleJanitor",
    description: "Silences noisy framework warnings in DevTools without touching real errors.",
    authors: [{ name: "OmniYap" }],
    tags: ["developer", "utility"],
    settings,

    start(ctx) {
        const originals = {};
        const counts = { log: 0, info: 0, debug: 0, warn: 0 };
        const matches = (text) => {
            const lower = String(text).toLowerCase();
            return parseList(settings.store.patterns, 100).some((pattern) => lower.includes(pattern.toLowerCase()));
        };
        const format = (args) => args.map((arg) => {
            if (typeof arg === "string") return arg;
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        }).join(" ");

        for (const level of ["log", "info", "debug"]) {
            originals[level] = console[level];
            console[level] = (...args) => {
                if (matches(format(args))) {
                    counts[level]++;
                    return;
                }
                return originals[level].apply(console, args);
            };
        }
        originals.warn = console.warn;
        console.warn = (...args) => {
            if (settings.store.quietWarnings && matches(format(args))) {
                counts.warn++;
                return;
            }
            return originals.warn.apply(console, args);
        };

        const open = () => {
            openModal({
                title: "Console janitor",
                subtitle: "Only this session's noise is counted",
                width: 520,
                body: h("div", {},
                    ...Object.entries(counts).map(([level, count]) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" }, h("b", {}, `console.${level}`), h("span", {}, "suppressed lines")),
                        h("b", {}, String(count)),
                    )),
                    h("p", { class: "omniyap-muted" }, "Edit the patterns in the plugin settings. Errors and exceptions are never filtered."),
                ),
                actions: [{
                    label: "Reset counters",
                    onClick: () => {
                        for (const level of Object.keys(counts)) counts[level] = 0;
                        open();
                    },
                }],
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "console-janitor",
            label: "Console janitor",
            icon: "⌫",
            description: "See how many noisy console lines were filtered.",
            onClick: open,
        }));

        ctx.cleanup(() => {
            for (const level of Object.keys(originals)) console[level] = originals[level];
        });
    },
});
