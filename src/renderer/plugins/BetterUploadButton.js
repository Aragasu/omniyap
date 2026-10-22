import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, dom } from "./_shared.js";

const settings = definePluginSettings({
    dropAnywhere: { type: OptionType.BOOLEAN, description: "Drop files anywhere in the window to upload them.", default: true },
    pasteFiles: { type: OptionType.BOOLEAN, description: "Paste files or images from the clipboard to upload them.", default: true },
    clickChat: { type: OptionType.BOOLEAN, description: "Click empty space in the chat to open the file picker.", default: false },
});

function fileInput() {
    return document.querySelector('input[type="file"]');
}

function handOff(files) {
    const input = fileInput();
    if (!input || !files?.length) {
        dom.toast("Yapper's upload input is not available right now.", { type: "error" });
        return false;
    }
    try {
        const transfer = new DataTransfer();
        for (const file of files) transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        dom.toast(`${files.length} file${files.length === 1 ? "" : "s"} queued for upload`, { type: "success" });
        return true;
    } catch (err) {
        dom.toast("Could not hand the files to Yapper.", { type: "error" });
        return false;
    }
}

export default definePlugin({
    name: "BetterUploadButton",
    description: "Drop or paste files anywhere in the chat to upload them, and optionally click empty chat space to open the picker.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        let dragging = false;

        const overlay = h("div", { class: "omniyap-drop-zone", "aria-hidden": "true" },
            h("div", { class: "omniyap-drop-inner" }, "Drop to upload"));

        const show = () => {
            if (!overlay.isConnected) (document.body || document.documentElement).append(overlay);
            overlay.classList.add("on");
        };
        const hide = () => {
            dragging = false;
            overlay.classList.remove("on");
        };

        const onDragOver = (event) => {
            if (!settings.store.dropAnywhere) return;
            if (![...(event.dataTransfer?.types || [])].includes("Files")) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
            if (!dragging) {
                dragging = true;
                show();
            }
        };
        const onDragLeave = (event) => {
            if (event.relatedTarget) return;
            hide();
        };
        const onDrop = (event) => {
            if (!settings.store.dropAnywhere) return;
            const files = event.dataTransfer?.files;
            if (!files?.length) return hide();
            event.preventDefault();
            event.stopPropagation();
            hide();
            handOff(files);
        };
        const onPaste = (event) => {
            if (!settings.store.pasteFiles) return;
            const files = event.clipboardData?.files;
            if (!files?.length) return;
            const inComposer = event.target instanceof Element && event.target.closest("textarea, input, [contenteditable]");
            if (!inComposer) return;
            if (handOff(files)) event.preventDefault();
        };
        const onClick = (event) => {
            if (!settings.store.clickChat) return;
            const list = event.target instanceof Element ? event.target.closest(".msg-list, .chat-scroll, .messages") : null;
            if (!list || event.target.closest(".msg, button, a, input, textarea, video, img")) return;
            fileInput()?.click();
        };

        window.addEventListener("dragover", onDragOver, true);
        window.addEventListener("dragleave", onDragLeave, true);
        window.addEventListener("drop", onDrop, true);
        document.addEventListener("paste", onPaste, true);
        document.addEventListener("click", onClick, true);

        ctx.css(`
            .omniyap-drop-zone{position:fixed;inset:10px;z-index:2147483000;border:2px dashed rgba(139,57,253,.7);
                border-radius:16px;background:rgba(139,57,253,.08);display:none;pointer-events:none;place-items:center;
                backdrop-filter:blur(2px)}
            .omniyap-drop-zone.on{display:grid}
            .omniyap-drop-inner{padding:14px 22px;border-radius:12px;background:#1b1b26;border:1px solid rgba(139,57,253,.5);
                color:#d9c2ff;font:600 15px Inter,system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)}
        `);

        ctx.cleanup(() => {
            window.removeEventListener("dragover", onDragOver, true);
            window.removeEventListener("dragleave", onDragLeave, true);
            window.removeEventListener("drop", onDrop, true);
            document.removeEventListener("paste", onPaste, true);
            document.removeEventListener("click", onClick, true);
            overlay.remove();
        });
    },
});
