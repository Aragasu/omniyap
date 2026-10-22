import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    showOnline: {
        type: OptionType.BOOLEAN,
        description: "Also show how many are online.",
        default: true,
    },
});

function onlineCount(members) {
    return members.filter((member) => {
        const status = member?.status || member?.presence || member?.user?.status;
        return status && status !== "offline" && status !== "invisible";
    }).length;
}

export default definePlugin({
    name: "MemberCount",
    description: "Shows the number of members in the open server.",
    authors: [{ name: "OmniYap" }],
    tags: ["servers", "utility"],
    settings,

    start(ctx) {
        const update = () => {
            const head = document.querySelector(".sidebar-head.server-head .title");
            if (!head) return;
            const channel = store.activeChannel();
            const serverId = channel?.server_id;
            if (!serverId) return;

            const members = store.members(serverId);
            const total = store.memberCount(serverId);
            if (!total) return;

            let badge = head.querySelector(".omniyap-member-count");
            if (!badge) {
                badge = h("span", { class: "omniyap-member-count", title: "Members" });
                head.appendChild(badge);
            }
            const online = settings.store.showOnline
                ? members.filter((id) => {
                    const status = store.online(id);
                    return status && status !== "offline" && status !== "invisible";
                }).length
                : 0;
            const label = online ? `${total} · ${online} online` : String(total);
            if (badge.textContent !== label) badge.textContent = label;
        };

        ctx.on("store:change", update);
        ctx.onMutate(update);
        ctx.interval(update, 4000);
        update();

        ctx.css(`
            .sidebar-head .title{display:inline-flex;align-items:center;gap:8px}
            .omniyap-member-count{font:500 10px Inter,system-ui,sans-serif;color:#8b8d98;background:rgba(255,255,255,.06);
                border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:1px 7px;white-space:nowrap}
        `);
    },
});
