import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h, authorOf } from "./_shared.js";

const settings = definePluginSettings({
    showPlaceholder: {
        type: OptionType.BOOLEAN,
        description: "Leave a one-line placeholder instead of the message.",
        default: true,
    },
});

function blockedIds() {
    return store.blockedUsers();
}

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides messages from people you blocked, without leaving gaps in the chat.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "privacy"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const blocked = blockedIds();
            if (!blocked.size) {
                el.classList.remove("omniyap-blocked");
                el.querySelector(".omniyap-blocked-note")?.remove();
                return;
            }
            const id = message?.author_id || message?.user_id || message?.sender_id || authorOf(el).id;
            if (!id || !blocked.has(id)) {
                el.classList.remove("omniyap-blocked");
                el.querySelector(".omniyap-blocked-note")?.remove();
                return;
            }
            if (el.classList.contains("omniyap-blocked")) return;
            el.classList.add("omniyap-blocked");
            if (settings.store.showPlaceholder) {
                el.appendChild(h("div", { class: "omniyap-blocked-note" }, "Message from a blocked user"));
            }
        };

        ctx.cleanup(messages.decorate(decorate));
        let signature = [...blockedIds()].sort().join(",");
        ctx.on("store:change", () => {
            const next = [...blockedIds()].sort().join(",");
            if (next === signature) return;
            signature = next;
            messages.refresh();
        });

        ctx.css(`
            .msg.omniyap-blocked > .msg-body > .msg-text,
            .msg.omniyap-blocked > .msg-body > .msg-head,
            .msg.omniyap-blocked > .msg-gutter,
            .msg.omniyap-blocked > .msg-actions,
            .msg.omniyap-blocked > .reply-preview,
            .msg.omniyap-blocked .omniyap-quick-reactions { display: none !important; }
            .omniyap-blocked-note{padding:2px 10px;color:#7c7f8a;font-size:11.5px;font-style:italic}
            .msg.omniyap-blocked{min-height:0;padding-top:2px;padding-bottom:2px}
        `);
    },
});
