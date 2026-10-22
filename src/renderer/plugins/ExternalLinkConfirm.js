import { definePlugin, definePluginSettings, OptionType, native } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    allowInternal: { type: OptionType.BOOLEAN, description: "Open Yapper links without asking.", default: true },
    showUrl: { type: OptionType.BOOLEAN, description: "Show the full URL in the confirmation.", default: true },
});

const INTERNAL = /(^|\.)yapper\.website$/i;

export default definePlugin({
    name: "ExternalLinkConfirm",
    description: "Asks before opening a link that leaves Yapper, showing the full destination first. No accidental phishing clicks.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "utility"],
    settings,

    start(ctx) {
        const onClick = (event) => {
            if (!(event.target instanceof Element) || event.defaultPrevented) return;
            const link = event.target.closest("a[href]");
            if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
            let url;
            try {
                url = new URL(link.getAttribute("href"), location.href);
            } catch {
                return;
            }
            if (!/^https?:$/.test(url.protocol)) return;
            if (INTERNAL.test(url.hostname) && settings.store.allowInternal) return;
            event.preventDefault();
            event.stopPropagation();
            openModal({
                title: "Leave Yapper?",
                subtitle: url.hostname.replace(/^www\./, ""),
                width: 520,
                body: h("div", {},
                    h("p", { style: { marginTop: 0 } }, "This link opens in your browser and leaves the app."),
                    settings.store.showUrl ? h("div", { class: "omniyap-pre" }, url.href) : null,
                    h("p", { class: "omniyap-muted" }, "Only continue if you trust the sender and recognise the address."),
                ),
                actions: [
                    { label: "Cancel" },
                    { label: "Open link", primary: true, onClick: ({ close }) => { native.openExternal(url.href); close(); } },
                ],
            });
        };

        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));
    },
});
