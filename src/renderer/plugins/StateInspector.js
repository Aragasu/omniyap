import { definePlugin, store } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

function summary(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value && typeof value === "object") return `Object(${Object.keys(value).length})`;
    const text = String(value);
    return text.length > 48 ? `"${text.slice(0, 48)}…"` : JSON.stringify(value);
}

function preview(value) {
    try {
        const json = JSON.stringify(value, (key, item) => (typeof item === "function" ? "[function]" : item), 2);
        return json.length > 18_000 ? `${json.slice(0, 18_000)}\n… truncated` : json;
    } catch {
        return "(cannot serialise this value)";
    }
}

function openInspector() {
    const search = h("input", { class: "omniyap-search", style: { width: "100%" }, placeholder: "Filter state keys…" });
    const list = h("div", { class: "omniyap-state-list" });
    const status = h("div", { class: "omniyap-muted", style: { margin: "6px 0 0" } });

    const render = () => {
        const state = store.getState() || {};
        const query = search.value.trim().toLowerCase();
        const keys = Object.keys(state).filter((key) => !query || key.toLowerCase().includes(query)).sort();
        list.replaceChildren(...keys.map((key) => {
            const row = h("div", { class: "omniyap-state-row" },
                h("button", { class: "omniyap-state-key", type: "button" },
                    h("b", {}, key),
                    h("span", {}, summary(state[key])),
                ),
                h("pre", { class: "omniyap-pre omniyap-state-value", hidden: true }, preview(state[key])),
            );
            const button = row.querySelector("button");
            const value = row.querySelector("pre");
            button.addEventListener("click", () => {
                value.hidden = !value.hidden;
                row.classList.toggle("open", !value.hidden);
            });
            return row;
        }));
        status.textContent = `${keys.length} keys · ${Object.keys(state).length} total`;
    };

    search.addEventListener("input", render);
    openModal({
        title: "Yapper state",
        subtitle: "A read-only look at the client store",
        width: 760,
        body: h("div", {}, search, h("div", { style: { height: "8px" } }), list, status),
        actions: [
            { label: "Copy all", onClick: () => navigator.clipboard.writeText(preview(store.getState())) },
            { label: "Refresh", primary: true, onClick: render },
        ],
        onMount: render,
    });
}

export default definePlugin({
    name: "StateInspector",
    description: "Browse the live Yapper client state in a read-only panel: profiles, channels, settings, calls, unread counters and more.",
    authors: [{ name: "OmniYap" }],
    tags: ["development", "utility"],

    start(ctx) {
        ctx.cleanup(ui.registerTool({
            id: "state-inspector",
            label: "Yapper state",
            icon: "{ }",
            description: "Inspect the client store.",
            onClick: openInspector,
        }));
        ctx.css(`
            .omniyap-state-list{max-height:52vh;overflow:auto;border:1px solid rgba(255,255,255,.07);border-radius:9px}
            .omniyap-state-row{border-bottom:1px solid rgba(255,255,255,.045)}
            .omniyap-state-row:last-child{border-bottom:0}
            .omniyap-state-key{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;
                border:0;background:transparent;color:#dfe1e8;padding:7px 10px;cursor:pointer;text-align:left;
                font:500 12px Inter,system-ui,sans-serif}
            .omniyap-state-key:hover{background:rgba(255,255,255,.03)}
            .omniyap-state-key b{font:600 12px ui-monospace,monospace;color:#c9a9ff}
            .omniyap-state-key span{font:400 10.5px ui-monospace,monospace;color:#858895;white-space:nowrap;
                overflow:hidden;text-overflow:ellipsis;max-width:55%}
            .omniyap-state-value{margin:0 10px 10px;max-height:260px}
            .omniyap-state-value[hidden]{display:none}
            .omniyap-state-row.open .omniyap-state-key{background:rgba(139,57,253,.1)}
        `);
    },
});
