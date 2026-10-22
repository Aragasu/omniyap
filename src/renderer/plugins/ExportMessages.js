import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, headerButton, downloadText, formatTime, messageAuthorId, messages } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    includeAttachments: { type: OptionType.BOOLEAN, description: "Include attachment URLs.", default: true },
    includeIds: { type: OptionType.BOOLEAN, description: "Include message and author IDs in JSON exports.", default: false },
});

function rows() {
    const channelId = store.activeChannelId();
    const list = store.messages(channelId);
    return list.map((message) => {
        const authorId = messageAuthorId(message);
        return {
            id: message.id,
            authorId,
            author: store.displayName(authorId) || message.author_name || "unknown",
            text: messages.content(message),
            at: message.created_at || message.timestamp || null,
            attachments: settings.store.includeAttachments
                ? (Array.isArray(message.attachments) ? message.attachments : []).map((file) => file?.url || file?.path).filter(Boolean)
                : [],
        };
    });
}

function asJson(data) {
    return JSON.stringify(data.map((row) => {
        if (settings.store.includeIds) return row;
        return { author: row.author, text: row.text, at: row.at, ...(row.attachments.length ? { attachments: row.attachments } : {}) };
    }), null, 2);
}

function asMarkdown(data) {
    return data.map((row) => {
        const when = row.at ? formatTime(row.at) : "";
        return `**${row.author}**${when ? ` · ${when}` : ""}\n${row.text}${row.attachments.length ? `\n${row.attachments.join("\n")}` : ""}`;
    }).join("\n\n");
}

function asCsv(data) {
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    return ["author,time,text,attachments", ...data.map((row) => [row.author, row.at || "", row.text, row.attachments.join(" ")].map(quote).join(","))].join("\n");
}

export default definePlugin({
    name: "ExportMessages",
    description: "Exports the loaded messages of the open channel as Markdown, JSON or CSV.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "productivity"],
    settings,

    start(ctx) {
        const open = () => {
            const data = rows();
            if (!data.length) {
                ctx.toast("There are no loaded messages in this channel.");
                return;
            }
            const format = h("select", { class: "omniyap-search", style: { width: "100%" } },
                h("option", { value: "md" }, "Markdown (.md)"),
                h("option", { value: "json" }, "JSON (.json)"),
                h("option", { value: "csv" }, "CSV (.csv)"),
            );
            const preview = h("div", { class: "omniyap-pre" }, `#${store.channelName(store.activeChannelId())} · ${data.length} messages\n\n` +
                data.slice(0, 4).map((row) => `${row.author}: ${row.text}`).join("\n"));
            openModal({
                title: "Export messages",
                subtitle: `${data.length} loaded messages in #${store.channelName(store.activeChannelId())}`,
                width: 600,
                body: h("div", {}, format, h("div", { style: { height: "10px" } }), preview),
                actions: [{
                    label: "Download",
                    primary: true,
                    onClick: () => {
                        const kind = format.value;
                        const name = `${store.channelName(store.activeChannelId()) || "channel"}-${new Date().toISOString().slice(0, 10)}.${kind}`;
                        const text = kind === "json" ? asJson(data) : kind === "csv" ? asCsv(data) : asMarkdown(data);
                        downloadText(name, text, kind === "json" ? "application/json" : kind === "csv" ? "text/csv" : "text/markdown");
                        ctx.toast("Export downloaded", { type: "success" });
                    },
                }, {
                    label: "Copy",
                    onClick: () => {
                        const kind = format.value;
                        navigator.clipboard.writeText(kind === "json" ? asJson(data) : kind === "csv" ? asCsv(data) : asMarkdown(data));
                        ctx.toast("Copied to clipboard", { type: "success" });
                    },
                }],
            });
        };

        const mount = () => headerButton({ className: "omniyap-export-btn", title: "Export messages", text: "⇩", onClick: open });
        ctx.watch("header.main-head", mount);
        ctx.cleanup(() => document.querySelector(".omniyap-export-btn")?.remove());
        ctx.css(`.omniyap-export-btn{font-size:14px;width:26px;height:26px;padding:0}`);
        mount();
    },
});
