import { definePlugin, native, dom, boot } from "../core/api.js";
import { messages, authorOf, messageUrl } from "./_shared.js";

const inApp = () => !!boot && boot.mode === "standalone";

export default definePlugin({
    name: "WebContextMenus",
    description: "Native right-click menus for links, images, selected text and messages.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "app"],

    start(ctx) {
        if (!inApp() || typeof native.contextMenu !== "function") {
            ctx.log.info("native context menus need the desktop app; leaving the browser menu alone");
            return;
        }

        const onContext = async (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            const row = target.closest(".msg[data-message-id]");
            const link = target.closest("a[href]");
            const image = target.closest("img");
            const selection = String(window.getSelection() || "").trim();
            const template = [];

            if (link) {
                template.push(
                    { id: "open-link", label: "Open link in browser" },
                    { id: "copy-link", label: "Copy link" },
                    { separator: true },
                );
            }
            if (image) {
                template.push(
                    { id: "copy-image", label: "Copy image URL" },
                    { id: "save-image", label: "Save image…" },
                    { id: "view-image", label: "Open image in browser" },
                    { separator: true },
                );
            }
            if (selection) {
                template.push({ id: "copy-selection", label: "Copy" }, { separator: true });
            }
            if (row) {
                template.push(
                    { id: "copy-message", label: "Copy message text" },
                    { id: "copy-message-link", label: "Copy message link" },
                    { id: "reply", label: "Reply", enabled: !!row.querySelector('.msg-actions button[aria-label="Reply"]') },
                    { id: "quote", label: "Quote in composer" },
                );
            }
            if (!template.length) return;

            event.preventDefault();
            event.stopPropagation();
            const choice = await native.contextMenu(template);
            if (!choice) return;

            const info = row ? messages.info(row) : null;
            switch (choice) {
                case "open-link":
                    await native.openExternal(link.href);
                    break;
                case "copy-link":
                    await native.copy(link.href);
                    break;
                case "copy-image":
                    await native.copy(image.currentSrc || image.src);
                    break;
                case "save-image": {
                    const linkEl = document.createElement("a");
                    linkEl.href = image.currentSrc || image.src;
                    linkEl.download = "";
                    linkEl.target = "_blank";
                    document.body.appendChild(linkEl);
                    linkEl.click();
                    linkEl.remove();
                    break;
                }
                case "view-image":
                    await native.openExternal(image.currentSrc || image.src);
                    break;
                case "copy-selection":
                    await native.copy(selection);
                    break;
                case "copy-message":
                    await native.copy(info?.textEl?.innerText || "");
                    break;
                case "copy-message-link":
                    await native.copy(messageUrl(row.getAttribute("data-message-id")));
                    break;
                case "reply":
                    row.querySelector('.msg-actions button[aria-label="Reply"]')?.click();
                    break;
                case "quote": {
                    const text = info?.textEl?.innerText || "";
                    const author = authorOf(row).name || "someone";
                    const composer = document.querySelector(".composer textarea");
                    if (composer) {
                        const quoted = text.split("\n").map((line) => `> ${line}`).join("\n");
                        const next = `${composer.value}${composer.value ? "\n" : ""}> **${author}**\n${quoted}\n\n`;
                        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
                        setter?.call(composer, next);
                        composer.dispatchEvent(new Event("input", { bubbles: true }));
                        composer.focus();
                    }
                    break;
                }
                default:
                    break;
            }
        };

        document.addEventListener("contextmenu", onContext, true);
        ctx.cleanup(() => document.removeEventListener("contextmenu", onContext, true));
        ctx.log.info("native context menus active");
    },
});
