import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, localJson, formatTime, insertIntoComposer } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const data = localJson("clipboard-history", []);
const read = () => (Array.isArray(data.read()) ? data.read() : []);

const settings = definePluginSettings({
    size: { type: OptionType.SLIDER, description: "How many copied snippets to keep.", default: 30, min: 5, max: 100, step: 5 },
});

function openList() {
    const entries = read().slice().reverse();
    const body = h("div");
    const render = () => {
        body.replaceChildren(entries.length ? h("div", {}, ...entries.map((entry, index) => h("div", { class: "omniyap-row" },
            h("div", { class: "label", style: { minWidth: 0 } },
                h("b", { style: { whiteSpace: "pre-wrap", maxHeight: "44px", overflow: "hidden" } }, entry.text.slice(0, 200)),
                h("span", {}, formatTime(entry.at)),
            ),
            h("div", { style: { display: "flex", gap: "5px", flex: "none" } },
                h("button", { class: "omniyap-btn", onclick: () => insertIntoComposer(entry.text) }, "Insert"),
                h("button", { class: "omniyap-btn", onclick: () => navigator.clipboard.writeText(entry.text).then(() => window.OmniYap?.toast?.("Copied")) }, "Copy"),
            ),
        ))) : h("div", { class: "omniyap-empty" }, "Copy some text first. History is local to this device."));
    };
    openModal({
        title: "Clipboard history",
        subtitle: "Last copied snippets",
        width: 660,
        body,
        actions: [{ label: "Clear", onClick: () => { data.write([]); entries.length = 0; render(); } }],
        onMount: render,
    });
}

export default definePlugin({
    name: "ClipboardHistory",
    description: "Keeps the last few things you copied inside Yapper so you can paste them again after losing the clipboard.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "chat"],
    settings,

    start(ctx) {
        const onCopy = (event) => {
            let text = "";
            if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) {
                const el = event.target.closest("input, textarea");
                text = el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
            } else {
                text = window.getSelection()?.toString() || "";
            }
            text = text.trim();
            if (!text || text.length > 5000) return;
            const entries = read().filter((entry) => entry.text !== text);
            entries.push({ text, at: Date.now() });
            const limit = Math.max(5, Math.min(100, Number(settings.store.size) || 30));
            while (entries.length > limit) entries.shift();
            data.write(entries);
        };
        document.addEventListener("copy", onCopy, true);
        ctx.cleanup(() => document.removeEventListener("copy", onCopy, true));
        ctx.cleanup(ui.registerTool({
            id: "clipboard-history",
            label: "Clipboard history",
            icon: "⎘",
            description: "Things you copied recently.",
            onClick: openList,
        }));
    },
});
