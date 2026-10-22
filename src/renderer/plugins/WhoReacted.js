import { definePlugin, messages, store } from "../core/api.js";
import { h, addMessageAction } from "./_shared.js";
import { openModal } from "../ui/modal.js";

function people(entry) {
    if (!entry) return [];
    if (Array.isArray(entry)) return entry;
    const raw = entry.users || entry.user_ids || entry.userIds || entry.reactors || [];
    return Array.isArray(raw) ? raw : Object.keys(raw || {});
}

function groups(message) {
    if (!message) return [];
    const raw = message.reactions;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((entry) => ({
            emoji: entry?.emoji || entry?.name || entry?.reaction || "?",
            users: people(entry),
            count: entry?.count ?? people(entry).length,
        }));
    }
    if (typeof raw === "object") {
        return Object.entries(raw).map(([emoji, entry]) => ({
            emoji,
            users: people(entry),
            count: entry?.count ?? people(entry).length,
        }));
    }
    return [];
}

export default definePlugin({
    name: "WhoReacted",
    description: "Click a message action to see exactly who reacted with which emoji.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings: undefined,

    start(ctx) {
        const decorate = ({ el, message }) => {
            if (!groups(message).length || el.querySelector('[data-omniyap-action="Reacted"]')) return;
            addMessageAction(el, {
                label: "Reacted",
                title: "See who reacted",
                html: "☺",
                onClick: () => {
                    const data = groups(message);
                    if (!data.length) return ctx.toast("No reaction details are loaded for this message.");
                    openModal({
                        title: "Who reacted",
                        subtitle: data.reduce((sum, group) => sum + group.count, 0) + " reactions",
                        width: 480,
                        body: h("div", {}, ...data.map((group) => h("div", { class: "omniyap-row", style: { alignItems: "flex-start" } },
                            h("div", { class: "label" },
                                h("b", {}, `${group.emoji} × ${group.count}`),
                                h("span", { style: { whiteSpace: "normal" } },
                                    group.users.length
                                        ? group.users.map((userId) => store.displayName(userId) || userId).join(", ")
                                        : "Names are not loaded for this reaction."),
                            ),
                        ))),
                    });
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Reacted"]{font-size:13px;width:26px;height:26px;padding:0}`);
    },
});
