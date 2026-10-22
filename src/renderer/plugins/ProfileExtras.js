import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    mutualServers: { type: OptionType.BOOLEAN, description: "Show servers you share with this person.", default: true },
    joinDates: { type: OptionType.BOOLEAN, description: "Show account and server join dates when Yapper has them.", default: true },
    activity: { type: OptionType.BOOLEAN, description: "Show their current activity.", default: true },
    roles: { type: OptionType.BOOLEAN, description: "List their roles in this server.", default: true },
});

function asDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function joinedAt(state, userId, serverId) {
    const source = state.joinedAt;
    if (!source) return null;
    const direct = source[userId];
    if (direct) {
        const date = asDate(direct.joined_at || direct.joinedAt || direct.at || direct);
        if (date) return date;
    }
    if (serverId) {
        const byServer = source[serverId];
        if (byServer) {
            const value = byServer[userId];
            const date = asDate(value?.joined_at || value?.joinedAt || value?.at || value);
            if (date) return date;
        }
        const combined = source[`${serverId}:${userId}`] || source[`${serverId}-${userId}`];
        const date = asDate(combined?.joined_at || combined?.at || combined);
        if (date) return date;
    }
    return null;
}

function roleNames(state, userId, serverId) {
    const memberRoles = state.memberRoles;
    if (!memberRoles) return [];
    let raw = memberRoles[userId];
    if (!raw && serverId) raw = memberRoles[serverId]?.[userId];
    if (!raw) return [];
    const ids = Array.isArray(raw) ? raw : Object.keys(raw).filter((key) => raw[key]);
    const pools = [];
    if (state.roles) {
        if (serverId && state.roles[serverId]) pools.push(state.roles[serverId]);
        pools.push(state.roles);
    }
    const names = [];
    for (const id of ids) {
        const roleId = typeof id === "string" ? id : id?.id || id?.role_id;
        if (!roleId) continue;
        for (const pool of pools) {
            const role = Array.isArray(pool) ? pool.find((entry) => entry?.id === roleId) : pool[roleId];
            if (role?.name) {
                names.push({ name: role.name, color: role.color || role.colour || null });
                break;
            }
        }
    }
    return names.slice(0, 12);
}

function activityOf(state, userId) {
    const raw = state.activity?.[userId];
    if (!raw) return null;
    if (typeof raw === "string") return raw;
    const name = raw.name || raw.activity || raw.type || raw.title;
    const detail = raw.details || raw.detail || raw.state || raw.text;
    return [name, detail].filter(Boolean).join(" · ") || null;
}

function build(userId) {
    const state = store.getState();
    if (!state) return null;
    const me = state.userId;
    const channel = store.activeChannel();
    const serverId = channel?.server_id || state.activeServerId;
    const items = [];

    if (settings.store.activity) {
        const activity = activityOf(state, userId);
        if (activity) items.push(h("div", { class: "omniyap-pc-line" }, h("span", { class: "omniyap-pc-key" }, "Activity"), h("span", {}, activity)));
    }

    if (settings.store.joinDates) {
        const account = asDate(state.profiles?.[userId]?.created_at || state.profiles?.[userId]?.createdAt);
        const server = joinedAt(state, userId, serverId);
        if (account) items.push(h("div", { class: "omniyap-pc-line" }, h("span", { class: "omniyap-pc-key" }, "Joined Yapper"), h("span", {}, account.toLocaleDateString())));
        if (server) items.push(h("div", { class: "omniyap-pc-line" }, h("span", { class: "omniyap-pc-key" }, "Joined this server"), h("span", {}, server.toLocaleDateString())));
    }

    if (settings.store.mutualServers && userId !== me) {
        const shared = [];
        for (const [id, server] of Object.entries(store.servers())) {
            if (!server || id === serverId) continue;
            if (store.members(id).includes(userId)) shared.push(server.name || "Unnamed server");
        }
        if (shared.length) {
            items.push(h("div", { class: "omniyap-pc-line" }, h("span", { class: "omniyap-pc-key" }, `Mutual servers · ${shared.length}`),
                h("span", { class: "omniyap-pc-servers", title: shared.join(", ") }, shared.slice(0, 4).join(", ") + (shared.length > 4 ? ` +${shared.length - 4}` : ""))));
        }
    }

    if (settings.store.roles && serverId) {
        const roles = roleNames(state, userId, serverId);
        if (roles.length) {
            items.push(h("div", { class: "omniyap-pc-line" }, h("span", { class: "omniyap-pc-key" }, "Roles"),
                h("span", { class: "omniyap-pc-roles" }, ...roles.map((role) => h("span", {
                    class: "omniyap-pc-role",
                    style: role.color ? { color: role.color, borderColor: `${role.color}55` } : {},
                }, role.name)))));
        }
    }

    if (!items.length) return null;
    return h("div", { class: "omniyap-pc-section" }, ...items);
}

export default definePlugin({
    name: "ProfileExtras",
    description: "Adds mutual servers, account and server join dates, current activity and role chips to profile cards.",
    authors: [{ name: "OmniYap" }],
    tags: ["people", "profile", "utility"],
    settings,

    start(ctx) {
        let rebuilding = false;
        const sync = (force = false) => {
            if (rebuilding) return;
            const card = document.querySelector(".profile-card");
            if (!card) return;
            const userId = store.getState()?.profileCard;
            if (!userId) return;
            const host = card.querySelector(".pc2-top") || card;
            const wanted = build(userId);
            const existing = host.querySelector(":scope > .omniyap-pc-section");
            if (!wanted) {
                existing?.remove();
                return;
            }
            // Never replace an unchanged section from a mutation callback: that would retrigger
            // onMutate forever. Store changes clear the marker first so the next render is fresh.
            if (existing && existing.dataset.omniyapUser === userId && !force) return;
            if (existing && force) existing.dataset.omniyapUser = "";
            if (existing) existing.remove();
            wanted.dataset.omniyapUser = userId;
            rebuilding = true;
            const quick = host.querySelector(".pc-quick");
            if (quick) quick.after(wanted);
            else host.appendChild(wanted);
            setTimeout(() => { rebuilding = false; }, 0);
        };

        ctx.onMutate(() => sync(false));
        ctx.on("store:change", () => sync(true));
        ctx.cleanup(settings.onChange(sync));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-pc-section").forEach((node) => node.remove()));
        ctx.css(`
            .omniyap-pc-section{margin:8px 14px 12px;padding:9px 11px;border-radius:9px;background:rgba(0,0,0,.24);
                border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:6px}
            .omniyap-pc-line{display:flex;align-items:flex-start;gap:9px;font:500 11.5px Inter,system-ui,sans-serif;color:#c6c8d0}
            .omniyap-pc-key{color:#858895;min-width:104px;flex:none;font-weight:600}
            .omniyap-pc-servers{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px}
            .omniyap-pc-roles{display:flex;flex-wrap:wrap;gap:3px}
            .omniyap-pc-role{font:600 10px Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,.16);
                border-radius:999px;padding:0 6px;color:#d7d9e0;background:rgba(255,255,255,.05)}
        `);
        sync();
    },
});
