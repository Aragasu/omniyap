import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h, addMessageAction } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const ENGINES = [
    { id: "lens", label: "Google Lens", url: (image) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(image)}` },
    { id: "tineye", label: "TinEye", url: (image) => `https://tineye.com/search?url=${encodeURIComponent(image)}` },
    { id: "yandex", label: "Yandex", url: (image) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(image)}` },
    { id: "bing", label: "Bing", url: (image) => `https://www.bing.com/images/search?q=imgurl:${encodeURIComponent(image)}&view=detailv2&iss=sbi` },
    { id: "saucenao", label: "SauceNAO", url: (image) => `https://saucenao.com/search.php?url=${encodeURIComponent(image)}` },
];

const settings = definePluginSettings({
    defaultEngine: {
        type: OptionType.SELECT,
        description: "Engine used when clicking the action directly.",
        options: ENGINES.map((engine) => ({ label: engine.label, value: engine.id })),
        default: "lens",
    },
    askEveryTime: { type: OptionType.BOOLEAN, description: "Show every engine instead of using the default.", default: true },
});

function firstImage(row, message) {
    const img = row.querySelector(".msg-image img, .msg-body img");
    if (img?.src && !img.closest(".avatar")) return img.currentSrc || img.src;
    const attachment = (message?.attachments || []).find((file) => /image|png|jpe?g|gif|webp/i.test(`${file?.type || ""} ${file?.url || file?.path || ""}`));
    return attachment?.url || attachment?.path || null;
}

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Looks up an image in Google Lens, TinEye, Yandex, Bing or SauceNAO from the message menu.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],
    settings,

    start(ctx) {
        const open = (image) => {
            if (!image) return ctx.toast("No image or link found in this message");
            if (!settings.store.askEveryTime) {
                const engine = ENGINES.find((entry) => entry.id === settings.store.defaultEngine) || ENGINES[0];
                window.open(engine.url(image), "_blank", "noopener,noreferrer");
                return;
            }
            openModal({
                title: "Reverse image search",
                subtitle: image.length > 70 ? `${image.slice(0, 70)}…` : image,
                width: 460,
                body: h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    ...ENGINES.map((engine) => h("button", {
                        class: "omniyap-btn",
                        style: { textAlign: "left" },
                        onclick: () => {
                            window.open(engine.url(image), "_blank", "noopener,noreferrer");
                            document.querySelector(".omniyap-modal-root:not([hidden]) .omniyap-modal-head .icon-btn")?.click();
                        },
                    }, engine.label)),
                ),
            });
        };

        const decorate = ({ el, message }) => {
            if (el.querySelector('[data-omniyap-action="Image search"]')) return;
            const image = firstImage(el, message);
            if (!image) return;
            addMessageAction(el, {
                label: "Image search",
                title: "Reverse image search",
                html: "⌕",
                onClick: () => open(image),
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`[data-omniyap-action="Image search"]{font-size:14px;width:26px;height:26px;padding:0}`);
    },
});
