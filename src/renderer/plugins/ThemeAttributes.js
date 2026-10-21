import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";

const settings = definePluginSettings({
    authorAttributes: {
        type: OptionType.BOOLEAN,
        description: "Add data-omniyap-author, data-omniyap-mine and data-omniyap-reply to message rows.",
        default: true,
    },
    channelAttributes: {
        type: OptionType.BOOLEAN,
        description: "Add data-omniyap-channel and data-omniyap-dm to <html>.",
        default: true,
    },
});

export default definePlugin({
    name: "ThemeAttributes",
    description: "Adds stable data attributes to messages and the page so themes and Quick CSS can target authors, your own messages and the current channel.",
    authors: [{ name: "OmniYap" }],
    tags: ["developer", "appearance", "themes"],
    settings,

    start(ctx) {
        const root = document.documentElement;

        const syncChannel = () => {
            if (!settings.store.channelAttributes) {
                delete root.dataset.omniyapChannel;
                delete root.dataset.omniyapDm;
                return;
            }
            const channelId = store.activeChannelId();
            if (!channelId) {
                delete root.dataset.omniyapChannel;
                delete root.dataset.omniyapDm;
                return;
            }
            root.dataset.omniyapChannel = channelId;
            if (store.isDmChannel(channelId)) root.dataset.omniyapDm = "";
            else delete root.dataset.omniyapDm;
        };

        const decorate = ({ el, message }) => {
            if (!settings.store.authorAttributes) {
                delete el.dataset.omniyapAuthor;
                delete el.dataset.omniyapMine;
                delete el.dataset.omniyapReply;
                return;
            }
            if (!message) return;
            el.dataset.omniyapAuthor = message.author_id || "";
            if (message.author_id && message.author_id === store.myId()) el.dataset.omniyapMine = "";
            else delete el.dataset.omniyapMine;
            if (message.reply_to_id) el.dataset.omniyapReply = message.reply_to_id;
            else delete el.dataset.omniyapReply;
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId !== previous.activeChannelId) syncChannel();
        });
        ctx.cleanup(settings.onChange(() => {
            syncChannel();
            messages.refresh();
            if (!settings.store.authorAttributes) {
                document.querySelectorAll("[data-omniyap-author]").forEach((element) => {
                    delete element.dataset.omniyapAuthor;
                    delete element.dataset.omniyapMine;
                    delete element.dataset.omniyapReply;
                });
            }
        }));

        syncChannel();
        ctx.cleanup(() => {
            delete root.dataset.omniyapChannel;
            delete root.dataset.omniyapDm;
            document.querySelectorAll("[data-omniyap-author]").forEach((element) => {
                delete element.dataset.omniyapAuthor;
                delete element.dataset.omniyapMine;
                delete element.dataset.omniyapReply;
            });
        });
    },
});
