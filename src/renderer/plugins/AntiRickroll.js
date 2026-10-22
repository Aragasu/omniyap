import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h } from "./_shared.js";

const KNOWN = new Set(["dQw4w9WgXcQ", "oHg5SJYRHA0", "6_b7RDuLwcU", "ub82Xb1C8os"]);
const YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-z0-9_-]{6,})/i;

const settings = definePluginSettings({
    hideThumbnail: { type: OptionType.BOOLEAN, description: "Hide the preview thumbnail of a known rickroll.", default: true },
});

export default definePlugin({
    name: "AntiRickroll",
    description: "Labels links to the classic rickroll videos before you click them, with an optional thumbnail cover.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "privacy"],
    settings,

    start(ctx) {
        const decorate = ({ el }) => {
            el.querySelectorAll(".msg-text a[href]").forEach((link) => {
                const match = YOUTUBE.exec(link.getAttribute("href") || "");
                if (!match || !KNOWN.has(match[1])) return;
                if (link.dataset.omniyapRickroll) return;
                link.dataset.omniyapRickroll = "1";
                link.after(h("span", { class: "omniyap-rickroll", title: "This is the rickroll video" }, "🎣 rickroll"));
                if (settings.store.hideThumbnail) {
                    const body = el.querySelector(":scope > .msg-body");
                    body?.querySelectorAll(".embed, .link-embed, iframe, img").forEach((node) => {
                        if (node.closest(".msg-text")) return;
                        node.classList.add("omniyap-rickroll-hidden");
                    });
                }
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(() => {
            document.querySelectorAll(".omniyap-rickroll").forEach((node) => node.remove());
            document.querySelectorAll(".omniyap-rickroll-hidden").forEach((node) => node.classList.remove("omniyap-rickroll-hidden"));
        });
        ctx.css(`
            .omniyap-rickroll{font:700 9.5px Inter,system-ui,sans-serif;color:#f0a75d;background:rgba(240,167,93,.12);
                border:1px solid rgba(240,167,93,.3);border-radius:999px;padding:0 5px;margin-left:4px;vertical-align:middle}
            .omniyap-rickroll-hidden{display:none!important}
        `);
    },
});
