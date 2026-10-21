import { definePlugin, definePluginSettings, OptionType, dom } from "../core/api.js";
import { h, localJson } from "./_shared.js";

// Font files are kept locally (data URL in localStorage) and loaded with the FontFace API.
// Nothing is uploaded anywhere.
const fonts = localJson("custom-fonts", []);
const loaded = new Map(); // family -> FontFace
const MAX_BYTES = 4 * 1024 * 1024;

const settings = definePluginSettings({
    family: {
        type: OptionType.STRING,
        description: "The imported family to use. Importing a file fills this in for you.",
        default: "",
        placeholder: "My Font",
    },
    size: {
        type: OptionType.SLIDER,
        description: "Text size in percent.",
        default: 100,
        min: 80,
        max: 130,
        step: 5,
    },
    importer: {
        type: OptionType.CUSTOM,
        default: "",
        description: "Import a .woff2, .woff, .ttf or .otf file from this computer.",
        render(box, plugin) {
            const status = h("span", { class: "omniyap-muted" }, "");
            const input = h("input", {
                type: "file",
                accept: ".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf",
                style: { display: "none" },
                onchange: async () => {
                    const file = input.files?.[0];
                    input.value = "";
                    if (!file) return;
                    try {
                        await importFont(file, plugin, status);
                    } catch (error) {
                        status.textContent = error?.message || "Could not import that font.";
                        dom.toast(status.textContent, { type: "error" });
                    }
                },
            });

            const list = h("div", { class: "omniyap-muted", style: { marginTop: "8px" } });
            const drawList = () => {
                const items = fonts.read();
                list.replaceChildren(
                    ...items.map((font) =>
                        h("div", { style: { display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" } },
                            h("span", { style: { fontFamily: `"${font.family}"`, flex: "1" } }, font.family),
                            h("button", {
                                class: "omniyap-btn",
                                onclick: () => {
                                    fonts.write(items.filter((entry) => entry.family !== font.family));
                                    const face = loaded.get(font.family);
                                    if (face) {
                                        try {
                                            document.fonts.delete(face);
                                        } catch {
                                            /* already gone */
                                        }
                                        loaded.delete(font.family);
                                    }
                                    if (plugin.settings.store.family === font.family) plugin.settings.set("family", "");
                                    drawList();
                                },
                            }, "Remove"),
                        ),
                    ),
                    items.length ? null : h("div", {}, "No imported fonts yet."),
                );
            };
            drawList();

            box.append(
                h("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                    h("button", { class: "omniyap-btn", onclick: () => input.click() }, "Choose font file…"),
                    status,
                ),
                input,
                list,
            );


        },
    },
});

async function importFont(file, plugin, status) {
    if (file.size > MAX_BYTES) throw new Error("That font is larger than 4 MB.");
    status.textContent = "Reading…";
    const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
    });

    const family = (file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported Font").slice(0, 60);
    const bytes = await fetch(data).then((response) => response.arrayBuffer());
    const face = new FontFace(family, bytes);
    await face.load();
    document.fonts.add(face);
    loaded.set(family, face);

    const items = fonts.read().filter((entry) => entry.family !== family);
    items.push({ family, data, addedAt: Date.now() });
    fonts.write(items);

    plugin.settings.set("family", family);
    status.textContent = `Imported “${family}”.`;
    dom.toast(`Font “${family}” imported`, { type: "success" });
}

export default definePlugin({
    name: "CustomFontFiles",
    description: "Imports a font file (.woff2/.woff/.ttf/.otf) from your computer and uses it in Yapper. Files stay on this device.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "customisation"],
    settings,

    start(ctx) {
        const load = async () => {
            for (const font of fonts.read()) {
                try {
                    const bytes = await fetch(font.data).then((response) => response.arrayBuffer());
                    const face = new FontFace(font.family, bytes);
                    await face.load();
                    document.fonts.add(face);
                    loaded.set(font.family, face);
                } catch (error) {
                    ctx.log.warn("could not load imported font", font.family, error);
                }
            }
            apply();
        };

        const apply = () => {
            const family = String(settings.store.family || "").trim();
            const size = Math.max(80, Math.min(130, Number(settings.store.size) || 100));
            const parts = [];
            if (family) {
                parts.push(`:root{--omniyap-font:"${family}",ui-sans-serif,system-ui,sans-serif}`);
                parts.push(`body,button,input,textarea,select,.msg-text,.msg-author{font-family:"${family}",ui-sans-serif,system-ui,sans-serif!important}`);
            }
            if (size !== 100) parts.push(`html{font-size:${size}%}`);
            ctx.css(parts.join("\n"));
        };

        load();
        ctx.cleanup(settings.onChange(apply));
    },
});
