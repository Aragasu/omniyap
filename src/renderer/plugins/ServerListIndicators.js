import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

function counts() {
    const state = store.getState();
    if (!state) return { friends: 0, servers: 0 };
    let friends = 0;
    for (const [id, status] of Object.entries(state.friends || {})) {
        const presence = state.online?.[id];
        if (status === "accepted" && presence && presence !== "offline" && presence !== "invisible") friends++;
    }
    return { friends, servers: Object.keys(state.servers || {}).filter((id) => state.servers[id]).length };
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "What to show.",
        options: [
            { label: "Friends and servers", value: "both" },
            { label: "Online friends", value: "friends" },
            { label: "Server count", value: "servers" },
        ],
        default: "both",
    },
});

export default definePlugin({
    name: "ServerListIndicators",
    description: "Shows how many friends are online and how many servers you are in, right under the logo in the server list.",
    authors: [{ name: "OmniYap" }],
    tags: ["servers", "appearance"],
    settings,

    start(ctx) {
        let box = null;

        const update = () => {
            const rail = document.querySelector("nav.rail");
            if (!rail) return;
            if (!box || !box.isConnected) {
                box = h("div", { class: "omniyap-sli", "aria-label": "Online friends and server count" });
            }
            const anchor = rail.querySelector(':scope > .rail-wrap:has(button.rail-item[aria-label="Direct messages"]), :scope > .rail-wrap');
            if (anchor) anchor.after(box);
            else rail.prepend(box);

            const data = counts();
            const mode = settings.store.mode;
            const parts = [];
            if (mode !== "servers") {
                parts.push(h("div", { class: "omniyap-sli-row", title: `${data.friends} friends online` },
                    h("i", { class: "omniyap-sli-dot" }), String(data.friends)));
            }
            if (mode !== "friends") {
                parts.push(h("div", { class: "omniyap-sli-row", title: `${data.servers} servers` },
                    String(data.servers), h("span", { class: "omniyap-sli-unit" }, " srv")));
            }
            const key = `${mode}:${data.friends}:${data.servers}`;
            if (box.getAttribute("data-key") !== key) {
                box.setAttribute("data-key", key);
                box.replaceChildren(...parts);
            }
        };

        ctx.css(`
            .omniyap-sli{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:700;
                color:#8b8d98;line-height:1.2;user-select:none;padding:2px 0}
            .omniyap-sli-row{display:flex;align-items:center;gap:4px}
            .omniyap-sli-dot{width:8px;height:8px;border-radius:50%;background:var(--success,#3ba55d);display:inline-block}
            .omniyap-sli-unit{font-weight:500;opacity:.8}
        `);

        ctx.on("store:change", (state, previous) => {
            if (state.friends !== previous.friends || state.online !== previous.online || state.servers !== previous.servers) update();
        });
        ctx.onMutate(update);
        ctx.cleanup(settings.onChange(update));
        ctx.cleanup(() => box?.remove());
        ctx.interval(update, 5000);

        update();
    },
});
