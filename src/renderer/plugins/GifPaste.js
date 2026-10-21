import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, sendMessage } from "./_shared.js";

const settings = definePluginSettings({
    sendImmediately: {
        type: OptionType.BOOLEAN,
        description: "Send the GIF right away instead of leaving it in the composer.",
        default: true,
    },
});

const GIF_URL = /^https?:\/\/\S+\.(gif|webp|mp4|webm)(\?\S*)?$/i;

export default definePlugin({
    name: "GifPaste",
    description: "Pasting a direct GIF or video URL sends it as a message.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "chat"],
    settings,

    start(ctx) {
        const onPaste = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const text = (event.clipboardData?.getData("text") || "").trim();
            if (!GIF_URL.test(text)) return;
            event.preventDefault();
            if (settings.store.sendImmediately) {
                void sendMessage(text);
            } else {
                const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
                setter?.call(composer, text);
                composer.dispatchEvent(new Event("input", { bubbles: true }));
            }
        };
        document.addEventListener("paste", onPaste, true);
        ctx.cleanup(() => document.removeEventListener("paste", onPaste, true));
    },
});
