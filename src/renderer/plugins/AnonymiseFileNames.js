import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    pattern: {
        type: OptionType.SELECT,
        description: "How to rename files.",
        options: [
            { label: "Random name (image-8f2a.png)", value: "random" },
            { label: "Timestamp (2026-10-21-141530.png)", value: "timestamp" },
            { label: "Keep extension only (file.png)", value: "plain" },
        ],
        default: "random",
    },
});

function newName(file) {
    const dot = file.name.lastIndexOf(".");
    const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const mode = settings.store.pattern;
    if (mode === "plain") return `file${extension}`;
    if (mode === "timestamp") return `${stamp}${extension}`;
    return `${file.type.startsWith("image/") ? "image" : "file"}-${Math.random().toString(36).slice(2, 6)}${extension}`;
}

export default definePlugin({
    name: "AnonymiseFileNames",
    description: "Renames files before upload so original names are not shared.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "media"],
    settings,

    start(ctx) {
        const onShadowChange = (event) => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.files?.length) return;
            if (input.dataset.omniyapRenamed === "1") return;
            try {
                const transfer = new DataTransfer();
                for (const file of input.files) {
                    transfer.items.add(new File([file], newName(file), { type: file.type, lastModified: file.lastModified }));
                }
                input.files = transfer.files;
                input.dataset.omniyapRenamed = "1";
                ctx.log.info(`renamed ${transfer.files.length} file(s) for upload`);
            } catch (err) {
                ctx.log.warn("could not rename uploads", err);
            }
        };

        document.addEventListener("change", onShadowChange, true);
        ctx.cleanup(() => document.removeEventListener("change", onShadowChange, true));
    },
});
