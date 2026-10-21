import { definePlugin, native, boot } from "../core/api.js";
import { h, dom } from "./_shared.js";

export default definePlugin({
    name: "CopyEmojiMarkdown",
    description: "Right-click any emoji to copy its :shortcode: or image URL.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const onContext = async (event) => {
            const image = event.target instanceof Element ? event.target.closest("img.emoji") : null;
            if (!image) return;
            event.preventDefault();
            event.stopPropagation();

            const shortcode = image.getAttribute("alt") || image.getAttribute("title") || "";
            const markdown = shortcode.startsWith(":") ? shortcode : `:${shortcode}:`;
            const url = image.currentSrc || image.src;

            if (boot.mode === "standalone" && typeof native.contextMenu === "function") {
                const choice = await native.contextMenu([
                    { id: "shortcode", label: `Copy ${markdown}` },
                    { id: "image", label: "Copy emoji image" },
                    { id: "url", label: "Copy image URL" },
                ]);
                if (choice === "url") return void native.copy(url);
                if (choice === "image") {
                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                        dom.toast("Emoji copied", { type: "success" });
                    } catch {
                        void native.copy(url);
                    }
                    return;
                }
                return void native.copy(markdown);
            }

            await dom.copy(markdown, "Emoji shortcode copied");
        };

        document.addEventListener("contextmenu", onContext, true);
        ctx.cleanup(() => document.removeEventListener("contextmenu", onContext, true));
        ctx.css(`img.emoji{cursor:context-menu}`);
    },
});
