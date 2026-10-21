import { definePlugin, messages, store } from "../core/api.js";
import { h, addMessageAction, authorOf, localJson, jumpToMessage, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const bookmarks = localJson("bookmarks", []);
const MAX = 300;

function listBody(refresh) {
    const items = bookmarks.read();
    if (!items.length) return h("div", { class: "omniyap-empty" }, "No bookmarks yet. Use the ☆ action on a message.");
    return h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
        ...items.slice().reverse().map((item) => h("div", { class: "omniyap-row", style: { gap: "10px" } },
            h("div", { class: "label", style: { minWidth: 0 } },
                h("b", { style: { whiteSpace: "normal" } }, item.author || "unknown"),
                h("span", { style: { whiteSpace: "normal" } }, String(item.text || "").slice(0, 220)),
                h("span", {}, `${formatTime(item.at)}${item.channelName ? ` · #${item.channelName}` : ""}`),
            ),
            h("div", { style: { display: "flex", gap: "6px", flex: "none" } },
                h("button", {
                    class: "omniyap-btn",
                    onclick: async () => {
                        await jumpToMessage(item.channelId, item.id);
                    },
                }, "Jump"),
                h("button", {
                    class: "omniyap-btn",
                    onclick: () => {
                        bookmarks.write(bookmarks.read().filter((entry) => entry.id !== item.id));
                        refresh();
                    },
                }, "Remove"),
            ),
        )),
    );
}

export function openBookmarks() {
    let refresh = () => undefined;
    const { body } = openModal({
        title: "Bookmarks",
        subtitle: "Stored on this device",
        width: 640,
        body: h("div"),
        onMount: (bodyEl) => {
            refresh = () => bodyEl.replaceChildren(listBody(refresh));
            refresh();
        },
    });
    return body;
}

export default definePlugin({
    name: "MessageBookmarks",
    description: "Bookmark messages and jump back to them later.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "productivity"],

    start(ctx) {
        const decorate = ({ el, message, textEl }) => {
            if (el.querySelector('[data-omniyap-action="Bookmark"]')) return;
            addMessageAction(el, {
                label: "Bookmark",
                title: "Bookmark this message",
                html: "☆",
                onClick: () => {
                    const items = bookmarks.read();
                    const id = el.getAttribute("data-message-id");
                    if (items.some((item) => item.id === id)) {
                        bookmarks.write(items.filter((item) => item.id !== id));
                        ctx.toast("Bookmark removed");
                        el.querySelector('[data-omniyap-action="Bookmark"]').textContent = "☆";
                        return;
                    }
                    items.push({
                        id,
                        channelId: store.activeChannelId(),
                        channelName: store.channelName(store.activeChannelId()),
                        author: authorOf(el).name,
                        text: textEl?.innerText || "",
                        at: Date.now(),
                    });
                    bookmarks.write(items.slice(-MAX));
                    el.querySelector('[data-omniyap-action="Bookmark"]').textContent = "★";
                    ctx.toast("Bookmarked", { type: "success" });
                },
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(ui.registerTool({
            id: "bookmarks",
            label: "Bookmarks",
            icon: "☆",
            description: "Messages you saved with the ☆ action.",
            onClick: () => openBookmarks(),
        }));
        ctx.css(`
            [data-omniyap-action="Bookmark"]{font-size:15px;width:26px;height:26px;padding:0;line-height:1;color:#ffb454}
            .omniyap-flash{animation:omniyap-flash 1.6s ease}
            @keyframes omniyap-flash{0%,100%{background:transparent}20%{background:rgba(139,57,253,.18)}}
        `);
    },
});
