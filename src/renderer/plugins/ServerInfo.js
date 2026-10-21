import { definePlugin, store, dom } from "../core/api.js";
import { h, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";

function collect(serverId) {
    const state = store.getState();
    const server = state?.servers?.[serverId];
    if (!server) return null;
    const channels = Object.values(state.channels || {}).filter((channel) => channel?.server_id === serverId);
    const members = store.members(serverId);
    return {
        server,
        owner: server.owner_id ? store.displayName(server.owner_id) : "unknown",
        ownerTag: server.owner_id ? store.username(server.owner_id) : "",
        created: server.created_at ? formatTime(server.created_at) : "unknown",
        members: store.memberCount(serverId),
        loadedMembers: members.length,
        text: channels.filter((channel) => (channel.kind || channel.type) === "text").length,
        voice: channels.filter((channel) => (channel.kind || channel.type) === "voice").length,
        roles: (state.roles?.[serverId] || []).length,
        emojis: Object.values(state.emojis || {}).filter((emoji) => emoji?.server_id === serverId).length,
    };
}

function open(serverId) {
    const data = collect(serverId);
    if (!data) {
        dom.toast("This server is not loaded yet.", { type: "error" });
        return;
    }
    const rows = [
        ["Name", data.server.name],
        ["Server ID", data.server.id],
        ["Owner", data.ownerTag ? `${data.owner} (@${data.ownerTag})` : data.owner],
        ["Created", data.created],
        ["Members", `${data.members}${data.loadedMembers !== data.members ? ` (${data.loadedMembers} loaded)` : ""}`],
        ["Text channels", String(data.text)],
        ["Voice channels", String(data.voice)],
        ["Roles", String(data.roles)],
        ["Custom emojis", String(data.emojis)],
    ];
    if (data.server.description) rows.splice(1, 0, ["Description", data.server.description]);

    openModal({
        title: "Server info",
        subtitle: data.server.name,
        width: 520,
        body: h("div", {},
            ...rows.map(([label, value]) =>
                h("div", { class: "omniyap-row" },
                    h("div", { class: "label" }, h("b", {}, label), h("span", {}, String(value))),
                ),
            ),
        ),
        actions: [{
            label: "Copy server ID",
            onClick: () => {
                navigator.clipboard.writeText(String(data.server.id)).then(
                    () => dom.toast("Server ID copied", { type: "success" }),
                    () => dom.toast("Could not copy", { type: "error" }),
                );
            },
        }],
    });
}

export default definePlugin({
    name: "ServerInfo",
    description: "Adds a server info button to the server header: owner, creation date, members, channels, roles and emojis.",
    authors: [{ name: "OmniYap" }],
    tags: ["servers", "utility"],
    settings: undefined,

    start(ctx) {
        const addButton = () => {
            const head = document.querySelector(".sidebar-head.server-head, .sidebar-head");
            if (!head || head.querySelector(".omniyap-server-info")) return;
            if (!store.activeChannel()?.server_id) return;
            head.append(h("button", {
                class: "icon-btn omniyap-server-info",
                title: "Server info",
                "aria-label": "Server info",
                onclick: () => {
                    const serverId = store.activeChannel()?.server_id;
                    if (serverId) open(serverId);
                },
            }, "ⓘ"));
        };

        ctx.watch(".sidebar-head", addButton);
        ctx.on("store:change", addButton);
        ctx.onMutate(addButton);
        ctx.css(`
            .omniyap-server-info{font:700 13px Inter,system-ui,sans-serif;color:#b7b9c2;margin-left:4px}
            .omniyap-server-info:hover{color:#d9c2ff;border-color:rgba(139,57,253,.4)}
        `);
        addButton();
    },
});

export { collect, open };
