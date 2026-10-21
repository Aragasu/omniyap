import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    onlyInServers: {
        type: OptionType.BOOLEAN,
        description: "Only strip the mention in servers (DMs keep pings).",
        default: false,
    },
});

export default definePlugin({
    name: "NoReplyMention",
    description: "Replies no longer ping the author again.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const onReplyClick = (event) => {
            const button = event.target instanceof Element
                ? event.target.closest('.msg-actions button[aria-label="Reply"], .msg-actions button[title="Reply"]')
                : null;
            if (!button) return;
            if (settings.store.onlyInServers) {
                const inServer = !!document.querySelector(".sidebar-head.server-head");
                if (!inServer) return;
            }
            setTimeout(() => {
                const composer = getComposer();
                if (!composer) return;
                const next = composer.value.replace(/^(@\S+\s+)+/, "");
                if (next !== composer.value) setNativeValue(composer, next);
            }, 60);
        };

        document.addEventListener("click", onReplyClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onReplyClick, true));
    },
});
