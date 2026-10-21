import { definePlugin, definePluginSettings, OptionType, store, events } from "../core/api.js";
import { h, localJson, jumpToMessage, formatTime } from "./_shared.js";
import ui from "../ui/settings.js";
import { openModal } from "../ui/modal.js";

const history = localJson("message-log", { entries: [] });
const MAX_ENTRIES = 2000;

const settings = definePluginSettings({
    logEdits: { type: OptionType.BOOLEAN, description: "Keep previous versions of edited messages.", default: true },
    logDeletes: { type: OptionType.BOOLEAN, description: "Keep messages that are deleted.", default: true },
});

function remember(entry) {
    const data = history.read();
    data.entries = data.entries || [];
    data.entries.push(entry);
    if (data.entries.length > MAX_ENTRIES) data.entries.splice(0, data.entries.length - MAX_ENTRIES);
    history.write(data);
}

function textOf(message) {
    if (!message) return "";
    return String(message.content ?? message.text ?? message.body ?? "");
}

export default definePlugin({
    name: "MessageLogger",
    description: "Keeps a local log of edited and deleted messages, so nothing disappears silently.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "privacy", "utility"],
    settings,

    start(ctx) {
        let previousState = null;

        ctx.on("store:change", (state, previous) => {
            if (!state?.messages || !previous?.messages) return;
            const before = previous.messages;
            const after = state.messages;

            for (const [channelId, oldList] of Object.entries(before)) {
                const newList = after[channelId];
                if (!Array.isArray(oldList)) continue;
                if (!Array.isArray(newList)) continue;
                if (oldList === newList) continue;

                const newById = new Map();
                for (const message of newList) if (message?.id) newById.set(message.id, message);

                for (const old of oldList) {
                    if (!old?.id) continue;
                    const updated = newById.get(old.id);
                    if (!updated) {
                        if (settings.store.logDeletes) {
                            remember({
                                type: "delete",
                                id: old.id,
                                channelId,
                                channelName: store.channelName(channelId),
                                author: store.displayName(old.author_id || old.user_id) || old.author_name || "unknown",
                                text: textOf(old),
                                at: Date.now(),
                            });
                        }
                        continue;
                    }
                    if (settings.store.logEdits && textOf(updated) !== textOf(old)) {
                        remember({
                            type: "edit",
                            id: old.id,
                            channelId,
                            channelName: store.channelName(channelId),
                            author: store.displayName(old.author_id || old.user_id) || old.author_name || "unknown",
                            before: textOf(old),
                            text: textOf(updated),
                            at: Date.now(),
                        });
                    }
                }
            }
            previousState = state;
        });

        const openViewer = () => {
            const entries = (history.read().entries || []).slice().reverse().slice(0, 400);
            const body = h("div", {},
                entries.length
                    ? entries.map((entry) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label", style: { minWidth: 0 } },
                            h("b", {}, `${entry.type === "edit" ? "edited" : "deleted"} · ${entry.author}`),
                            h("span", { style: { whiteSpace: "normal", color: entry.type === "delete" ? "#ff9b9b" : "#9a9ca7" } },
                                entry.before ? `${entry.before} → ${entry.text}` : entry.text),
                            h("span", {}, `${formatTime(entry.at)}${entry.channelName ? ` · #${entry.channelName}` : ""}`),
                        ),
                        h("button", {
                            class: "omniyap-btn",
                            onclick: () => jumpToMessage(entry.channelId, entry.id),
                        }, "Go"),
                    ))
                    : h("div", { class: "omniyap-empty" }, "Nothing logged yet."),
            );
            openModal({
                title: "Message log",
                subtitle: "Stored locally",
                width: 720,
                body,
                actions: [{
                    label: "Clear log",
                    onClick: ({ close }) => {
                        history.write({ entries: [] });
                        close();
                    },
                }],
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "message-log",
            label: "Message log",
            icon: "⟲",
            description: "Edited and deleted messages kept on this device.",
            onClick: openViewer,
        }));
    },
});
