import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, headerButton, downloadUrl } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    includeVideos: { type: OptionType.BOOLEAN, description: "Also download video attachments.", default: true },
    delay: { type: OptionType.SLIDER, description: "Milliseconds between downloads.", default: 350, min: 100, max: 2000, step: 50 },
});

function files() {
    const state = store.getState();
    const seen = new Set();
    const out = [];
    for (const message of state?.messages?.[state.activeChannelId] || []) {
        for (const attachment of message?.attachments || []) {
            const url = attachment?.url || attachment?.path;
            if (!url || seen.has(url)) continue;
            const type = String(attachment?.type || attachment?.mime || "");
            const isVideo = /video/i.test(type) || /\.(mp4|webm|mov|mkv)(\?|$)/i.test(url);
            const isImage = /image/i.test(type) || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url);
            if (!isImage && !(isVideo && settings.store.includeVideos)) continue;
            seen.add(url);
            out.push({
                url: new URL(url, location.origin).href,
                name: attachment?.name || attachment?.filename || String(url).split("/").pop() || "attachment",
            });
        }
    }
    return out;
}

export default definePlugin({
    name: "ImageDownloadAll",
    description: "Downloads every image (and optionally video) from the loaded messages in the open channel.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        const open = () => {
            const list = files();
            if (!list.length) return ctx.toast("No downloadable media is loaded in this channel.");
            openModal({
                title: "Download channel media",
                subtitle: `${list.length} file${list.length === 1 ? "" : "s"} in #${store.channelName(store.activeChannelId())}`,
                width: 560,
                body: h("div", {},
                    h("p", { class: "omniyap-muted" }, "Your browser may ask for permission to download multiple files. Downloads are spaced out so none are dropped."),
                    h("div", { class: "omniyap-pre" }, list.slice(0, 12).map((file) => file.name).join("\n") + (list.length > 12 ? `\n…and ${list.length - 12} more` : "")),
                ),
                actions: [{
                    label: `Download ${list.length}`,
                    primary: true,
                    onClick: ({ close }) => {
                        close();
                        list.forEach((file, index) => {
                            setTimeout(() => downloadUrl(file.url, file.name), index * Math.max(100, Number(settings.store.delay) || 350));
                        });
                        ctx.toast(`Started ${list.length} downloads`, { type: "success" });
                    },
                }],
            });
        };

        ctx.watch("header.main-head", () => headerButton({
            className: "omniyap-media-dl",
            title: "Download all media",
            text: "🖼",
            onClick: open,
        }));
        ctx.cleanup(() => document.querySelector(".omniyap-media-dl")?.remove());
        ctx.css(`.omniyap-media-dl{font-size:12px;width:26px;height:26px;padding:0;filter:grayscale(.4)}`);
    },
});
