import { definePlugin, definePluginSettings, OptionType, native } from "../core/api.js";
import { h, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const zoom = localJson("zoom", { percent: 100 });

const settings = definePluginSettings({
    step: { type: OptionType.SLIDER, description: "Zoom step in percent.", default: 10, min: 5, max: 25, step: 5 },
    shortcuts: { type: OptionType.BOOLEAN, description: "Ctrl+= / Ctrl+- / Ctrl+0 zoom.", default: true },
    remember: { type: OptionType.BOOLEAN, description: "Reapply the saved zoom when the plugin starts.", default: true },
});

async function setZoom(percent) {
    const value = Math.max(50, Math.min(300, Math.round(percent)));
    zoom.write({ percent: value });
    try {
        await native.ui.setZoom(value);
    } catch {
        /* browser fallback */
    }
    return value;
}

export default definePlugin({
    name: "ZoomControls",
    description: "Remembers your zoom level and adds exact zoom controls with keyboard shortcuts.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "accessibility", "utility"],
    settings,

    start(ctx) {
        const step = () => Math.max(5, Math.min(25, Number(settings.store.step) || 10));
        const current = () => Number(zoom.read().percent) || 100;

        const open = () => {
            const label = h("div", { class: "omniyap-zoom-label" }, `${current()}%`);
            const apply = async (percent) => {
                const value = await setZoom(percent);
                label.textContent = `${value}%`;
            };
            openModal({
                title: "Zoom",
                subtitle: "50% – 300%",
                width: 420,
                body: h("div", { style: { display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" } },
                    label,
                    h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" } },
                        h("button", { class: "omniyap-btn", onclick: () => apply(current() - step()) }, `− ${step()}%`),
                        h("button", { class: "omniyap-btn", onclick: () => apply(100) }, "Reset 100%"),
                        h("button", { class: "omniyap-btn", onclick: () => apply(current() + step()) }, `+ ${step()}%`),
                    ),
                    h("p", { class: "omniyap-muted" }, "Ctrl+= zooms in, Ctrl+- zooms out, Ctrl+0 resets."),
                ),
            });
        };

        const onKey = (event) => {
            if (!settings.store.shortcuts || !event.ctrlKey || event.altKey) return;
            if (event.key === "=" || event.key === "+") {
                event.preventDefault();
                setZoom(current() + step());
            } else if (event.key === "-") {
                event.preventDefault();
                setZoom(current() - step());
            } else if (event.key === "0") {
                event.preventDefault();
                setZoom(100);
            }
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(ui.registerTool({
            id: "zoom",
            label: "Zoom",
            icon: "⤢",
            description: "Set an exact zoom level.",
            onClick: open,
        }));
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
        ctx.css(`.omniyap-zoom-label{font:700 34px Inter,system-ui,sans-serif;color:#d9c2ff;letter-spacing:-.03em}`);
        if (settings.store.remember) setZoom(current());
    },
});
