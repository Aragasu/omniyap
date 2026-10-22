import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    url: { type: OptionType.STRING, description: "Image URL (https://… or a data: URL). Leave empty for none.", default: "" },
    dim: { type: OptionType.SLIDER, description: "Darken the wallpaper (percent).", default: 55, min: 0, max: 95, step: 5 },
    blur: { type: OptionType.SLIDER, description: "Blur the wallpaper in pixels.", default: 0, min: 0, max: 20, step: 1 },
    fixed: { type: OptionType.BOOLEAN, description: "Keep the image fixed while messages scroll.", default: true },
});

function valid(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) return value;
    return "";
}

export default definePlugin({
    name: "ChatWallpaper",
    description: "Puts your own picture behind the message list, with dim and blur controls so text stays readable.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    settings,

    start(ctx) {
        const apply = () => {
            const url = valid(settings.store.url);
            const layer = document.querySelector(".messages");
            if (!url) {
                document.documentElement.style.removeProperty("--omniyap-wallpaper");
                layer?.classList.remove("omniyap-wallpaper-on");
                return;
            }
            document.documentElement.style.setProperty("--omniyap-wallpaper", `url("${url.replace(/"/g, "%22")}")`);
            document.documentElement.style.setProperty("--omniyap-wallpaper-dim", String(Math.max(0, Math.min(95, Number(settings.store.dim) || 0)) / 100));
            document.documentElement.style.setProperty("--omniyap-wallpaper-blur", `${Math.max(0, Number(settings.store.blur) || 0)}px`);
            document.documentElement.style.setProperty("--omniyap-wallpaper-attach", settings.store.fixed ? "fixed" : "scroll");
            layer?.classList.add("omniyap-wallpaper-on");
        };
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            document.documentElement.style.removeProperty("--omniyap-wallpaper");
            document.documentElement.style.removeProperty("--omniyap-wallpaper-dim");
            document.documentElement.style.removeProperty("--omniyap-wallpaper-blur");
            document.documentElement.style.removeProperty("--omniyap-wallpaper-attach");
            document.querySelectorAll(".omniyap-wallpaper-on").forEach((node) => node.classList.remove("omniyap-wallpaper-on"));
        });
        apply();
        ctx.css(`
            .messages.omniyap-wallpaper-on{position:relative}
            .messages.omniyap-wallpaper-on::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
                background-image:var(--omniyap-wallpaper);background-size:cover;background-position:center;
                background-attachment:var(--omniyap-wallpaper-attach,scroll);
                filter:blur(var(--omniyap-wallpaper-blur,0px))}
            .messages.omniyap-wallpaper-on::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
                background:rgba(9,9,14,var(--omniyap-wallpaper-dim,.55))}
            .messages.omniyap-wallpaper-on > *{position:relative;z-index:1}
        `);
    },
});
