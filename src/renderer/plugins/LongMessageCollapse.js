import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    height: { type: OptionType.SLIDER, description: "Collapse messages taller than this many pixels.", default: 300, min: 160, max: 700, step: 20 },
});

export default definePlugin({
    name: "LongMessageCollapse",
    description: "Collapses very long messages to a preview with a Show more button, so one wall of text cannot swallow the channel.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const applyHeight = () => {
            document.documentElement.style.setProperty("--omniyap-collapse-height", `${Math.max(160, Number(settings.store.height) || 300)}px`);
        };
        applyHeight();
        ctx.cleanup(settings.onChange(applyHeight));
        ctx.cleanup(() => document.documentElement.style.removeProperty("--omniyap-collapse-height"));

        // Measuring a row forces a layout, so only messages that could possibly be tall are measured,
        // and all of them are measured in one batch inside a single frame. Measuring inside the
        // decoration loop used to cost one full re-layout per message.
        const toMeasure = new Set();
        let measureFrame = null;

        const flushMeasure = () => {
            measureFrame = null;
            const jobs = [...toMeasure];
            toMeasure.clear();
            const limit = Math.max(160, Number(settings.store.height) || 300);
            const heights = jobs.map(({ text }) => text.getBoundingClientRect().height);
            jobs.forEach(({ el, button, text }, index) => {
                if (!el.isConnected || !text.isConnected) return;
                if (heights[index] > limit) {
                    el.classList.add("omniyap-collapsed");
                    button.hidden = false;
                } else {
                    el.classList.remove("omniyap-collapsed");
                    button.hidden = true;
                }
            });
        };

        const decorate = ({ el }) => {
            const body = el.querySelector(":scope > .msg-body");
            const text = body?.querySelector(":scope > .msg-text");
            if (!body || !text) return;
            const limit = Math.max(160, Number(settings.store.height) || 300);

            const expand = () => {
                el.classList.remove("omniyap-collapsed");
                button.textContent = "Show less";
            };

            let button = el.querySelector(".omniyap-expand-btn");
            if (!button) {
                button = h("button", { class: "omniyap-expand-btn", type: "button" }, "Show more");
                body.appendChild(button);
                button.addEventListener("click", (event) => {
                    event.stopPropagation();
                    if (el.classList.contains("omniyap-collapsed")) expand();
                    else {
                        el.classList.add("omniyap-collapsed");
                        button.textContent = "Show more";
                    }
                });
            }

            // Short plain messages cannot exceed the limit, so they never need a measurement.
            const media = text.querySelector("img, video, audio, iframe, pre");
            const length = text.textContent.length;
            if (!media && length < 320) {
                button.hidden = true;
                el.classList.remove("omniyap-collapsed");
                return;
            }

            const key = `${limit}|${length}|${media ? 1 : 0}`;
            if (el.dataset.omniyapCollapseKey === key) return;
            el.dataset.omniyapCollapseKey = key;

            // Measure without the clamp so the height is the real one.
            el.classList.remove("omniyap-collapsed");
            toMeasure.add({ el, button, text });
            if (measureFrame === null) measureFrame = requestAnimationFrame(flushMeasure);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => {
            document.querySelectorAll(".msg").forEach((row) => { delete row.dataset.omniyapCollapseKey; });
            messages.refresh();
        }));
        ctx.cleanup(() => {
            if (measureFrame !== null) cancelAnimationFrame(measureFrame);
            toMeasure.clear();
            document.querySelectorAll(".omniyap-expand-btn").forEach((node) => node.remove());
            document.querySelectorAll(".omniyap-collapsed").forEach((node) => node.classList.remove("omniyap-collapsed"));
        });
        ctx.css(`
            .msg.omniyap-collapsed .msg-text{max-height:var(--omniyap-collapse-height,300px);overflow:hidden;
                mask-image:linear-gradient(180deg,#000 72%,transparent 100%);-webkit-mask-image:linear-gradient(180deg,#000 72%,transparent 100%)}
            .omniyap-expand-btn{display:block;margin-top:4px;border:0;background:transparent;color:#b57bff;
                font:600 11.5px Inter,system-ui,sans-serif;cursor:pointer;padding:0}
            .omniyap-expand-btn:hover{text-decoration:underline}
            .omniyap-expand-btn[hidden]{display:none}
        `);
    },
});
