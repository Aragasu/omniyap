import { definePlugin } from "../core/api.js";
import { h, downloadText, jumpToMessage, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

function readLog() {
    try {
        const raw = localStorage.getItem("omniyap:message-log");
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed?.entries) ? parsed.entries : [];
    } catch {
        return [];
    }
}

function row(entry, refresh) {
    return h("div", { class: "omniyap-row", style: { alignItems: "flex-start" } },
        h("div", { class: "label", style: { minWidth: 0 } },
            h("b", { style: { whiteSpace: "normal" } }, `${entry.type === "edit" ? "edited" : "deleted"} · ${entry.author || "unknown"}`),
            h("span", { style: { whiteSpace: "normal", color: entry.type === "delete" ? "#ff9b9b" : "#b7b9c2" } },
                entry.before ? `${entry.before} → ${entry.text}` : entry.text || "(no text)"),
            h("span", {}, `${formatTime(entry.at)}${entry.channelName ? ` · #${entry.channelName}` : ""}`),
        ),
        h("div", { style: { display: "flex", gap: "6px", flex: "none" } },
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    await jumpToMessage(entry.channelId, entry.id);
                },
            }, "Jump"),
            h("button", {
                class: "omniyap-btn",
                onclick: () => navigator.clipboard.writeText(entry.text || ""),
            }, "Copy"),
        ),
    );
}

export default definePlugin({
    name: "MessageLoggerEnhanced",
    description: "A searchable, filterable browser for MessageLogger's local edit and delete history.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "privacy"],

    start(ctx) {
        const open = () => {
            let query = "";
            let filter = "all";
            const search = h("input", { class: "omniyap-search", style: { width: "100%" }, placeholder: "Search authors, text or channel…" });
            const select = h("select", { class: "omniyap-search", style: { width: "100%", marginTop: "6px" } },
                h("option", { value: "all" }, "Edits and deletions"),
                h("option", { value: "edit" }, "Edits only"),
                h("option", { value: "delete" }, "Deletions only"),
            );
            const list = h("div", { style: { marginTop: "8px" } });
            const summary = h("div", { class: "omniyap-muted", style: { margin: "8px 0" } });

            const render = () => {
                const needle = query.toLowerCase();
                const entries = readLog().slice().reverse().filter((entry) => {
                    if (filter !== "all" && entry.type !== filter) return false;
                    if (!needle) return true;
                    return `${entry.author} ${entry.text} ${entry.before} ${entry.channelName}`.toLowerCase().includes(needle);
                });
                summary.textContent = `${entries.length} entries${entries.length !== readLog().length ? ` of ${readLog().length}` : ""}`;
                list.replaceChildren(...(entries.length ? entries.slice(0, 300).map((entry) => row(entry, render)) : [h("div", { class: "omniyap-empty" }, "No entries match.")]));
            };

            search.addEventListener("input", () => {
                query = search.value;
                render();
            });
            select.addEventListener("change", () => {
                filter = select.value;
                render();
            });

            openModal({
                title: "Message history",
                subtitle: "Edits and deletions captured by MessageLogger",
                width: 760,
                body: h("div", {}, search, select, summary, list),
                actions: [
                    {
                        label: "Export JSON",
                        onClick: () => {
                            const entries = readLog();
                            downloadText(`omniyap-message-log-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(entries, null, 2), "application/json");
                        },
                    },
                    {
                        label: "Clear history",
                        onClick: ({ close }) => {
                            localStorage.removeItem("omniyap:message-log");
                            close();
                        },
                    },
                ],
                onMount: render,
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "message-history-browser",
            label: "Message history",
            icon: "🗂",
            description: "Search edits and deletions stored by MessageLogger.",
            onClick: open,
        }));
    },
});
