import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, localJson, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const events = localJson("relationship-events", []);

const settings = definePluginSettings({
    requests: { type: OptionType.BOOLEAN, description: "Notify about new incoming friend requests.", default: true },
    accepted: { type: OptionType.BOOLEAN, description: "Notify when a request is accepted.", default: true },
    removed: { type: OptionType.BOOLEAN, description: "Notify when someone is no longer a friend.", default: true },
    desktop: { type: OptionType.BOOLEAN, description: "Also raise a desktop notification.", default: true },
});

function notify(kind, userId) {
    const name = store.displayName(userId) || userId;
    const message = kind === "request" ? `${name} sent you a friend request`
        : kind === "accepted" ? `${name} accepted your friend request`
            : `${name} is no longer on your friends list`;
    const entry = { kind, userId, name, message, at: Date.now() };
    events.write([...events.read(), entry].slice(-100));
    ctxToast(message);
    if (settings.store.desktop && window.Notification?.permission === "granted") {
        try {
            new Notification("Yapper friends", { body: message, silent: false });
        } catch {
            /* ignore */
        }
    }
}

let ctxToast = () => undefined;

export default definePlugin({
    name: "RelationshipNotifier",
    description: "Notifies you when someone sends, accepts or cancels a friend request.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "social", "utility"],
    settings,

    start(ctx) {
        ctxToast = (message) => ctx.toast(message);
        let previous = store.getState()?.friends ? { ...store.getState().friends } : null;

        const open = () => {
            const list = events.read().slice().reverse();
            openModal({
                title: "Friend activity",
                subtitle: `${list.length} recent changes`,
                width: 560,
                body: list.length ? h("div", {}, ...list.map((entry) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" },
                        h("b", {}, entry.name),
                        h("span", {}, entry.message),
                        h("span", {}, formatTime(entry.at)),
                    ),
                    h("span", { class: `omniyap-rel-kind ${entry.kind}` }, entry.kind),
                ))) : h("div", { class: "omniyap-empty" }, "No friend changes since this plugin was enabled."),
            });
        };

        ctx.on("store:change", (state) => {
            const current = state?.friends;
            if (!current || typeof current !== "object") return;
            if (!previous) {
                previous = { ...current };
                return;
            }
            for (const [userId, status] of Object.entries(current)) {
                if (previous[userId] === status) continue;
                if (status === "pending" && previous[userId] !== "accepted" && settings.store.requests) notify("request", userId);
                else if (status === "accepted" && previous[userId] === "pending" && settings.store.accepted) notify("accepted", userId);
            }
            if (settings.store.removed) {
                for (const userId of Object.keys(previous)) {
                    if (!(userId in current)) notify("removed", userId);
                }
            }
            previous = { ...current };
        });

        ctx.cleanup(ui.registerTool({
            id: "friend-activity",
            label: "Friend activity",
            icon: "♡",
            description: "Recent friend requests, accepts and removals.",
            onClick: open,
        }));
        ctx.css(`
            .omniyap-rel-kind{font:600 9.5px Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em;
                padding:2px 7px;border-radius:999px;background:#2b2b39;color:#a9abb6}
            .omniyap-rel-kind.request{background:rgba(245,165,36,.15);color:#f5c46b}
            .omniyap-rel-kind.accepted{background:rgba(48,164,108,.15);color:#6ede9f}
            .omniyap-rel-kind.removed{background:rgba(229,72,77,.15);color:#ff9b9b}
        `);
    },
});
