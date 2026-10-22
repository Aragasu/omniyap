import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, headerButton } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    sortBy: {
        type: OptionType.SELECT,
        description: "Order of the list.",
        options: [
            { label: "Name", value: "name" },
            { label: "Status (pending first)", value: "status" },
            { label: "Recently seen", value: "presence" },
        ],
        default: "status",
    },
    showAccepted: { type: OptionType.BOOLEAN, description: "Include friends who already accepted.", default: true },
});

function friendRows() {
    const state = store.getState();
    if (!state?.friends) return [];
    return Object.entries(state.friends)
        .filter(([, status]) => status && status !== "blocked")
        .filter(([, status]) => settings.store.showAccepted || status !== "accepted")
        .map(([id, status]) => ({ id, status, name: store.displayName(id), username: store.username(id), presence: store.online(id) || "offline" }));
}

function sort(rows) {
    const list = rows.slice();
    if (settings.store.sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (settings.store.sortBy === "presence") {
        const rank = { online: 0, idle: 1, dnd: 2, offline: 3, invisible: 3 };
        list.sort((a, b) => (rank[a.presence] ?? 4) - (rank[b.presence] ?? 4) || a.name.localeCompare(b.name));
    } else {
        list.sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || a.name.localeCompare(b.name));
    }
    return list;
}

export default definePlugin({
    name: "SortFriendRequests",
    description: "Shows pending and accepted friends in a sorted list with a live pending count in the header.",
    authors: [{ name: "OmniYap" }],
    tags: ["social", "utility", "productivity"],
    settings,

    start(ctx) {
        const open = () => {
            const rows = sort(friendRows());
            openModal({
                title: "Friend requests",
                subtitle: `${rows.filter((row) => row.status === "pending").length} pending · ${rows.length} shown`,
                width: 560,
                body: rows.length ? h("div", {}, ...rows.map((row) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" },
                        h("b", {}, row.name),
                        h("span", {}, `@${row.username} · ${row.status}`),
                    ),
                    h("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
                        h("span", { class: `omniyap-friend-status ${row.presence}` }, row.presence),
                        h("button", {
                            class: "omniyap-btn",
                            onclick: () => {
                                navigator.clipboard.writeText(`@${row.username}`);
                                ctx.toast(`Copied @${row.username}`, { type: "success" });
                            },
                        }, "Copy"),
                    ),
                ))) : h("div", { class: "omniyap-empty" }, "No friends match the current filter."),
            });
        };

        const mount = () => {
            const pending = friendRows().filter((row) => row.status === "pending").length;
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head) return;
            let button = head.querySelector(".omniyap-friend-sort");
            if (!button) {
                button = headerButton({
                    className: "omniyap-friend-sort",
                    title: "Friend requests",
                    text: "♡",
                    onClick: open,
                });
            }
            if (!button) return;
            button.textContent = pending ? `♡ ${pending}` : "♡";
            button.classList.toggle("pending", pending > 0);
        };

        ctx.watch("header.main-head", mount);
        ctx.on("store:change", (state, previous) => {
            if (state.friends !== previous.friends || state.online !== previous.online) mount();
        });
        ctx.cleanup(settings.onChange(mount));
        ctx.cleanup(() => document.querySelector(".omniyap-friend-sort")?.remove());
        ctx.css(`
            .omniyap-friend-sort{font:600 11px Inter,system-ui,sans-serif;height:26px;min-width:26px;padding:0 6px}
            .omniyap-friend-sort.pending{color:#f5c46b;border-color:rgba(245,165,36,.4)}
            .omniyap-friend-status{font:600 9.5px Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;
                padding:2px 6px;border-radius:999px;background:#2b2b39;color:#a9abb6}
            .omniyap-friend-status.online{background:rgba(48,164,108,.16);color:#6ede9f}
            .omniyap-friend-status.idle{background:rgba(245,165,36,.16);color:#f5c46b}
            .omniyap-friend-status.dnd{background:rgba(229,72,77,.16);color:#ff9b9b}
        `);
        mount();
    },
});
