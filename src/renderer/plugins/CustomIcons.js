import { definePlugin, definePluginSettings, OptionType, dom } from "../core/api.js";
import { h } from "./_shared.js";

const HOME = 'button.rail-item[aria-label="Direct messages"], button.rail-item[title="Direct messages"]';
const isImage = (value) => typeof value === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(value);

/** Centre-crops an image file to a square PNG data URL. */
async function toSquarePng(file, size) {
    if (!/^image\//.test(file.type || "")) throw new Error("That is not an image.");
    if (file.size > 15 * 1024 * 1024) throw new Error("That image is larger than 15 MB.");
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const width = image.naturalWidth || size;
        const height = image.naturalHeight || size;
        const side = Math.min(width, height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
        return canvas.toDataURL("image/png");
    } finally {
        URL.revokeObjectURL(url);
    }
}

const settings = definePluginSettings({
    homeIcon: {
        type: OptionType.CUSTOM,
        default: "",
        description: "Picture for the Home button at the top of the server list.",
        render(box, plugin) {
            const preview = h("img", {
                alt: "",
                width: 40,
                height: 40,
                style: { width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", background: "rgba(255,255,255,.06)" },
            });
            const input = h("input", { type: "file", accept: "image/*", style: { display: "none" } });
            const status = h("span", { class: "omniyap-muted" }, "");

            const draw = () => {
                const url = plugin.settings.store.homeIcon;
                if (isImage(url)) preview.src = url;
                else preview.removeAttribute("src");
                preview.style.visibility = isImage(url) ? "visible" : "hidden";
                remove.disabled = !isImage(url);
            };

            const remove = h("button", {
                class: "omniyap-btn",
                onclick: () => {
                    plugin.settings.set("homeIcon", "");
                    status.textContent = "Back to the Yapper logo.";
                    draw();
                },
            }, "Remove");

            input.onchange = async () => {
                const file = input.files?.[0];
                input.value = "";
                if (!file) return;
                try {
                    plugin.settings.set("homeIcon", await toSquarePng(file, 128));
                    status.textContent = "Saved.";
                    draw();
                } catch (error) {
                    status.textContent = error?.message || "Could not use that image.";
                    dom.toast(status.textContent, { type: "error" });
                }
            };

            box.append(
                h("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                    preview,
                    h("button", { class: "omniyap-btn", onclick: () => input.click() }, "Choose picture…"),
                    remove,
                    status,
                ),
                input,
            );
            draw();
        },
    },
    size: {
        type: OptionType.SLIDER,
        description: "Home icon size in pixels.",
        default: 40,
        min: 28,
        max: 56,
        step: 2,
    },
    round: {
        type: OptionType.BOOLEAN,
        description: "Round the corners of the picture.",
        default: true,
    },
});

export default definePlugin({
    name: "CustomIcons",
    description: "Replaces the Home button picture at the top of the server list with your own image. Stored locally.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "customisation"],
    settings,

    start(ctx) {
        const apply = () => {
            const url = settings.store.homeIcon;
            const size = Math.max(28, Math.min(56, Number(settings.store.size) || 40));
            document.querySelectorAll(HOME).forEach((button) => {
                let image = button.querySelector(":scope > .omniyap-home-icon");
                if (!isImage(url)) {
                    image?.remove();
                    button.removeAttribute("data-omniyap-home");
                    return;
                }
                if (!image) {
                    image = h("img", { class: "omniyap-home-icon", alt: "", draggable: "false" });
                    button.append(image);
                }
                if (image.getAttribute("src") !== url) image.setAttribute("src", url);
                image.style.width = `${size}px`;
                image.style.height = `${size}px`;
                image.style.borderRadius = settings.store.round ? "30%" : "0";
                button.setAttribute("data-omniyap-home", "1");
            });
        };

        ctx.css(`
            ${HOME}[data-omniyap-home] > :not(.omniyap-home-icon){display:none!important}
            ${HOME} > .omniyap-home-icon{display:block;object-fit:cover;margin:auto;pointer-events:none}
        `);
        ctx.onMutate(apply);
        ctx.cleanup(settings.onChange(apply));
        apply();
    },
});
