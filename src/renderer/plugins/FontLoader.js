import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    url: { type: OptionType.STRING, description: "A CSS stylesheet URL (Google Fonts, Fontsource, Bunny Fonts…).", default: "", multiline: false },
    family: { type: OptionType.STRING, description: "The font-family name to apply. Leave empty to read it from the URL.", default: "" },
    applyToCode: { type: OptionType.BOOLEAN, description: "Also use the font for code blocks.", default: false },
});

function familyFromUrl(url) {
    try {
        const family = new URL(url).searchParams.get("family");
        return family ? family.split(":")[0].replace(/\+/g, " ") : "";
    } catch {
        return "";
    }
}

export default definePlugin({
    name: "FontLoader",
    description: "Loads a web font from a CSS URL and applies it across Yapper without editing Quick CSS.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "customisation"],
    settings,

    start(ctx) {
        let link = null;
        let style = null;

        const remove = () => {
            link?.remove();
            style?.remove();
            link = null;
            style = null;
            document.querySelectorAll(".omniyap-font-loading").forEach((node) => node.remove());
        };

        const apply = () => {
            remove();
            const url = String(settings.store.url || "").trim();
            if (!/^https:\/\//i.test(url)) return;
            const family = String(settings.store.family || "").trim() || familyFromUrl(url);
            if (!family) {
                ctx.toast("Add the font family name in the FontLoader settings.", { type: "error" });
                return;
            }
            link = h("link", { rel: "stylesheet", href: url, class: "omniyap-font-loading" });
            document.head.appendChild(link);
            style = h("style", { class: "omniyap-font-loading" });
            style.textContent = `
                body, button, input, textarea, select, .msg-text, .msg-author, .sidebar, .main-head {
                    font-family: "${family.replace(/"/g, '\\"')}", Inter, system-ui, sans-serif !important;
                }
                ${settings.store.applyToCode ? `pre, code, .omniyap-pre { font-family: "${family.replace(/"/g, '\\"')}", ui-monospace, monospace !important; }` : ""}
            `;
            document.head.appendChild(style);
            if (link.sheet === null) {
                link.addEventListener("error", () => ctx.toast("The font stylesheet could not be loaded.", { type: "error" }), { once: true });
            }
        };

        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(remove);
        apply();
    },
});
