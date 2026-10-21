import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    showSize: {
        type: OptionType.BOOLEAN,
        description: "Try to show the file size (requires a HEAD request).",
        default: false,
    },
});

function filenameOf(url) {
    try {
        const path = new URL(url).pathname;
        const last = decodeURIComponent(path.split("/").pop() || "");
        return last.replace(/^r2-\d+-[a-z0-9]+\./i, "file.").slice(0, 80) || "attachment";
    } catch {
        return "attachment";
    }
}

export default definePlugin({
    name: "ImageFilename",
    description: "Shows the original filename under images and attachments.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        const decorate = ({ body }) => {
            if (!body) return;
            body.querySelectorAll(".msg-image img, .msg-body img").forEach((img) => {
                if (img.closest(".avatar") || img.classList.contains("emoji")) return;
                const wrap = img.closest(".msg-image") || img.parentElement;
                if (!wrap || wrap.querySelector(".omniyap-filename")) return;
                const name = filenameOf(img.currentSrc || img.src);
                const label = h("span", { class: "omniyap-filename", title: img.currentSrc || img.src }, name);
                wrap.appendChild(h("div", { class: "omniyap-filename-row" }, label));
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-filename-row{display:flex;justify-content:space-between;gap:8px;padding:3px 2px 0;max-width:520px}
            .omniyap-filename{font:500 10.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#7c7f8a;
                overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        `);
    },
});
