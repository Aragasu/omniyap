import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h } from "./_shared.js";

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at"];
const INTERNAL = /(^|\.)yapper\.website$/i;

const settings = definePluginSettings({
    domain: { type: OptionType.BOOLEAN, description: "Show the destination domain under masked link text.", default: true },
    warn: { type: OptionType.BOOLEAN, description: "Mark shortened links that hide their destination.", default: true },
});

export default definePlugin({
    name: "LinkSafety",
    description: "Shows where a link really goes: the full URL on hover, the domain under masked text, and a warning on link shorteners.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "privacy", "utility"],
    settings,

    start(ctx) {
        const decorate = ({ el }) => {
            el.querySelectorAll(".msg-text a[href]").forEach((link) => {
                let url;
                try {
                    url = new URL(link.getAttribute("href"), location.href);
                } catch {
                    return;
                }
                if (!/^https?:$/.test(url.protocol)) return;
                if (INTERNAL.test(url.hostname)) return;
                link.title = url.href;
                link.classList.toggle("omniyap-short-link", settings.store.warn && SHORTENERS.includes(url.hostname.replace(/^www\./, "")));
                if (!settings.store.domain) return;
                if (link.dataset.omniyapDomain) return;
                const shown = link.textContent?.trim() || "";
                const masked = !shown.includes(url.hostname.replace(/^www\./, ""));
                if (!masked) return;
                link.dataset.omniyapDomain = "1";
                link.after(h("span", { class: "omniyap-link-domain", title: url.href }, url.hostname.replace(/^www\./, "")));
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(() => {
            document.querySelectorAll(".omniyap-link-domain").forEach((node) => node.remove());
            document.querySelectorAll("[data-omniyap-domain]").forEach((node) => node.removeAttribute("data-omniyap-domain"));
            document.querySelectorAll(".omniyap-short-link").forEach((node) => node.classList.remove("omniyap-short-link"));
        });
        ctx.css(`
            .omniyap-link-domain{font:600 9.5px Inter,system-ui,sans-serif;color:#7d818e;margin-left:4px;
                border:1px solid rgba(255,255,255,.09);border-radius:4px;padding:0 4px;vertical-align:middle;white-space:nowrap}
            .msg-text a.omniyap-short-link{color:#f0a75d!important}
            .msg-text a.omniyap-short-link::after{content:" ⚠";font-size:10px}
        `);
    },
});
