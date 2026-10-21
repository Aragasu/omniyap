import { definePlugin, definePluginSettings, OptionType, store, messages, dom } from "../core/api.js";
import { addMessageAction } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    confirm: { type: OptionType.BOOLEAN, description: 'Ask "Delete this message?" before deleting.', default: false },
});

function canDelete(message, state) {
    if (!message || !state || message.pending) return false;
    if (message.author_id && message.author_id === state.userId) return true;
    return !!(state.isAdmin || state.isMod);
}

async function remove(messageId) {
    const actions = store.live();
    if (!actions?.deleteMessage) {
        dom.toast("Could not find Yapper's delete function.", { type: "error" });
        return;
    }
    try {
        await Promise.resolve(actions.deleteMessage(messageId));
        dom.toast("Message deleted", { type: "success" });
    } catch (error) {
        dom.toast("Could not delete: " + (error?.message || error), { type: "error" });
    }
}

export default definePlugin({
    name: "QuickDelete",
    description: "Adds a one-click delete button to messages you are allowed to delete, without Yapper's confirmation window.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            if (!canDelete(message, store.getState())) return;
            if (el.querySelector(".webhook-author")) return;
            addMessageAction(el, {
                label: "Delete",
                title: "Delete message",
                html: "🗑",
                onClick: () => {
                    const id = el.getAttribute("data-message-id");
                    if (!id) return;
                    if (!settings.store.confirm) {
                        remove(id);
                        return;
                    }
                    openModal({
                        title: "Delete this message?",
                        subtitle: "This cannot be undone.",
                        body: `<div style="white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto">${String(
                            message?.content ?? message?.text ?? "(a picture or file)",
                        )
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")}</div>`,
                        actions: [{ label: "Delete", primary: true, onClick: ({ close }) => { close(); remove(id); } }],
                    });
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.on("store:change", (state, previous) => {
            if (state.isAdmin !== previous.isAdmin || state.isMod !== previous.isMod || state.userId !== previous.userId) {
                messages.refresh();
            }
        });
        ctx.css('[data-omniyap-action="Delete"]{color:#ff8a8a;font-size:13px}');
    },
});
