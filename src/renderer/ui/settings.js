// The OmniYap settings overlay. It lives outside Yapper's React root, so it can be opened from the
// user bar, the tray, or Ctrl+, without touching the app's own settings modal.
import OmniYap from "../core/state.js";
import settings, { OptionType } from "../core/settings.js";
import plugins from "../core/plugins.js";
import themes from "../core/themes.js";
import dom from "../core/dom.js";
import store from "../core/store.js";
import { finder, patches } from "../core/turbo.js";
import { native } from "../core/native.js";
import { escapeHtml, formatDateTime } from "../core/util.js";
import logoUrl from "../../../assets/logo-64.png";

const { h } = dom;

const CSS = `
.omniyap-root{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;
  font:14px/1.45 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#ececf1}
.omniyap-root[hidden]{display:none}
.omniyap-scrim{position:absolute;inset:0;background:rgba(8,8,12,.68);backdrop-filter:blur(3px)}
.omniyap-panel{position:relative;width:min(1040px,94vw);height:min(720px,90vh);background:#1b1b26;border:1px solid rgba(255,255,255,.09);
  border-radius:16px;display:flex;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.omniyap-side{width:224px;flex:none;background:#15151f;border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column}
.omniyap-brand{display:flex;align-items:center;gap:10px;padding:18px 16px 12px}
.omniyap-logo{width:34px;height:34px;border-radius:10px;object-fit:contain;flex:none;
  filter:drop-shadow(0 2px 8px rgba(139,57,253,.45))}
.omniyap-brand b{display:block;font-size:15px;letter-spacing:-.2px}
.omniyap-brand span{display:block;font-size:11px;color:#8b8d98}
.omniyap-nav{display:flex;flex-direction:column;gap:2px;padding:8px}
.omniyap-nav button{display:flex;align-items:center;gap:9px;padding:9px 11px;border:0;border-radius:8px;background:transparent;color:#b7b9c2;
  font:500 13px Inter,system-ui,sans-serif;cursor:pointer;text-align:left}
.omniyap-nav button:hover{background:rgba(255,255,255,.05);color:#ececf1}
.omniyap-nav button.active{background:rgba(139,57,253,.14);color:#d9c2ff}
.omniyap-nav .glyph{width:18px;text-align:center;font-size:14px}
.omniyap-side-foot{margin-top:auto;padding:12px 16px;font-size:11px;color:#7c7f8a;border-top:1px solid rgba(255,255,255,.06)}
.omniyap-side-foot b{color:#b7b9c2;font-weight:600}
.omniyap-main{flex:1;display:flex;flex-direction:column;min-width:0}
.omniyap-head{display:flex;align-items:center;gap:12px;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
.omniyap-head h2{margin:0;font-size:16px;font-weight:650;letter-spacing:-.2px}
.omniyap-head .spacer{flex:1}
.omniyap-search{width:230px;padding:8px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#12121a;color:#ececf1;
  font:13px Inter,system-ui,sans-serif;outline:none}
.omniyap-search:focus{border-color:#8b39fd}
.omniyap-close{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#22222e;color:#b7b9c2;cursor:pointer;font-size:16px;line-height:1}
.omniyap-close:hover{color:#fff;border-color:rgba(255,255,255,.2)}
.omniyap-body{flex:1;overflow:auto;padding:16px 20px 28px;scrollbar-width:thin}
.omniyap-body::-webkit-scrollbar{width:9px}
.omniyap-body::-webkit-scrollbar-thumb{background:#343444;border-radius:8px}
.omniyap-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.omniyap-pill{padding:5px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:#20202b;color:#b7b9c2;
  font:500 12px Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-pill.active{background:rgba(139,57,253,.16);border-color:rgba(139,57,253,.45);color:#d9c2ff}
.omniyap-pill:not(.active):hover{background:#2a2a37}
.omniyap-muted{color:#8b8d98;font-size:12px}
.omniyap-card{border:1px solid rgba(255,255,255,.075);border-radius:12px;background:#20202b;margin-bottom:10px;overflow:hidden}
.omniyap-card-head{display:flex;align-items:flex-start;gap:12px;padding:13px 14px}
.omniyap-card-head .info{flex:1;min-width:0}
.omniyap-card-head .name{font-weight:600;font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.omniyap-card-head .desc{color:#9a9ca7;font-size:12.5px;margin-top:3px}
.omniyap-card-head .meta{margin-top:5px;font-size:11px;color:#71737e;display:flex;gap:8px;flex-wrap:wrap}
.omniyap-tag{padding:1px 7px;border-radius:999px;background:#2b2b39;color:#a9abb6;font-size:10.5px;text-transform:lowercase}
.omniyap-error{color:#ff8d8d;font-size:11.5px;margin-top:6px;white-space:pre-wrap}
.omniyap-switch{position:relative;width:38px;height:21px;flex:none;margin-top:2px;cursor:pointer}
.omniyap-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:2}
.omniyap-switch span{position:absolute;inset:0;border-radius:999px;background:#3a3a4a;transition:background .16s}
.omniyap-switch span::after{content:"";position:absolute;width:15px;height:15px;left:3px;top:3px;border-radius:50%;background:#d6d7de;transition:transform .16s}
.omniyap-switch input:checked + span{background:#8b39fd}
.omniyap-switch input:checked + span::after{transform:translateX(17px);background:#fff}
.omniyap-options{border-top:1px solid rgba(255,255,255,.06);padding:10px 14px 12px;display:none;background:#1c1c27}
.omniyap-card.open .omniyap-options{display:block}
.omniyap-option{display:flex;align-items:center;gap:12px;padding:7px 0}
.omniyap-option .label{flex:1;min-width:0}
.omniyap-option .label b{display:block;font-weight:550;font-size:12.5px}
.omniyap-option .label span{display:block;color:#8b8d98;font-size:11.5px;margin-top:1px}
.omniyap-option input[type=text],.omniyap-option input[type=number],.omniyap-option select,.omniyap-option textarea{
  width:200px;padding:7px 9px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:#12121a;color:#ececf1;
  font:12.5px Inter,system-ui,sans-serif;outline:none}
.omniyap-option textarea{min-height:64px;resize:vertical;width:100%}
.omniyap-option input:focus,.omniyap-option select:focus,.omniyap-option textarea:focus{border-color:#8b39fd}
.omniyap-option .wide{width:100%}
.omniyap-reset{border:0;background:transparent;color:#8b8d98;font-size:11px;cursor:pointer;text-decoration:underline;padding:2px 0}
.omniyap-reset:hover{color:#b57bff}
.omniyap-btn{padding:8px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#262633;color:#ececf1;
  font:500 12.5px Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-btn:hover{background:#30303f}
.omniyap-btn.primary{background:#8b39fd;border-color:#8b39fd;color:#fff;font-weight:650}
.omniyap-btn.primary:hover{background:#ff8264}
.omniyap-btn:disabled{opacity:.5;cursor:default}
.omniyap-sec{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7c7f8a;margin:20px 0 8px}
.omniyap-card:first-of-type{margin-top:0}
.omniyap-css{width:100%;min-height:320px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12121a;
  color:#dfe1e8;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;outline:none}
.omniyap-css:focus{border-color:#8b39fd}
.omniyap-row{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.omniyap-row:last-child{border-bottom:0}
.omniyap-row .label b{display:block;font-weight:550;font-size:12.5px}
.omniyap-row .label span{display:block;color:#8b8d98;font-size:11.5px}
.omniyap-pre{background:#12121a;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;font:11.5px/1.5 ui-monospace,monospace;
  color:#a9abb6;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto}
.omniyap-empty{padding:36px 10px;text-align:center;color:#8b8d98;font-size:13px}
.omniyap-launch{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;border:1px solid rgba(139,57,253,.35);
  background:rgba(139,57,253,.13);color:#b57bff;font:700 10px Inter,system-ui,sans-serif;cursor:pointer;margin-left:2px}
.omniyap-launch:hover{background:rgba(139,57,253,.25);color:#e3d4ff}
.omniyap-tool-icon{color:#b57bff;margin-right:6px}
`;

const TABS = [
    { id: "plugins", label: "Plugins", glyph: "◈" },
    { id: "tools", label: "Tools", glyph: "✦" },
    { id: "themes", label: "Themes", glyph: "◐" },
    { id: "app", label: "App", glyph: "⚙" },
    { id: "diagnostics", label: "Diagnostics", glyph: "⌁" },
];

// Plugins contribute small utilities (log viewer, scheduled messages, profiles…). They live here
// instead of adding a row of cryptic buttons to Yapper's user bar.
const tools = new Map();

export function registerTool(tool) {
    if (!tool?.id || typeof tool.onClick !== "function") return () => undefined;
    tools.set(tool.id, tool);
    if (isOpen()) renderBody();
    return () => {
        tools.delete(tool.id);
        if (isOpen()) renderBody();
    };
}

function toolsTab() {
    const list = [...tools.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (!list.length) {
        return h("div", { class: "omniyap-empty" }, "No tools are registered. Enable the plugins that provide them.");
    }
    return h("div", {}, list.map((tool) => h("div", { class: "omniyap-card" },
        h("div", { class: "omniyap-card-head" },
            h("div", { class: "info" },
                h("div", { class: "name" }, tool.icon ? h("span", { class: "omniyap-tool-icon" }, tool.icon) : null, tool.label),
                tool.description ? h("div", { class: "desc" }, tool.description) : null,
            ),
            h("button", { class: "omniyap-btn primary", onclick: () => tool.onClick() }, "Open"),
        ),
    )));
}

let root = null;
let currentTab = "plugins";
let search = "";
let category = "all";
let openCards = new Set();

function optionRow(plugin, key, def) {
    const value = plugin.settings.store[key];
    let control;
    const type = def.type || OptionType.STRING;

    if (type === OptionType.BOOLEAN) {
        control = h("label", { class: "omniyap-switch" },
            h("input", {
                type: "checkbox",
                checked: !!value,
                onchange: (event) => {
                    plugin.settings.store[key] = event.target.checked;
                },
            }),
            h("span"),
        );
    } else if (type === OptionType.SELECT) {
        control = h("select", {
            onchange: (event) => {
                const selected = (def.options || []).find((option) => String(option.value) === event.target.value);
                plugin.settings.store[key] = selected ? selected.value : event.target.value;
            },
        }, (def.options || []).map((option) =>
            h("option", { value: String(option.value), selected: String(option.value) === String(value) }, option.label),
        ));
    } else if (type === OptionType.SLIDER || type === OptionType.NUMBER) {
        const isSlider = type === OptionType.SLIDER;
        control = h("input", {
            type: isSlider ? "range" : "number",
            value,
            min: def.min ?? (isSlider ? 0 : undefined),
            max: def.max ?? (isSlider ? 100 : undefined),
            step: def.step ?? (isSlider ? 1 : undefined),
            style: isSlider ? { width: "200px" } : undefined,
            oninput: (event) => {
                const number = Number(event.target.value);
                plugin.settings.store[key] = Number.isFinite(number) ? number : def.default;
            },
        });
    } else if (typeof def.render === "function") {
        control = h("div", { class: "omniyap-custom-option" });
        try {
            def.render(control, plugin);
        } catch (err) {
            control.textContent = "Could not render this option: " + (err?.message || err);
        }
    } else if (type === OptionType.STRING || type === OptionType.CUSTOM) {
        const isLong = def.multiline || (typeof value === "string" && value.includes("\n"));
        control = isLong
            ? h("textarea", {
                class: "wide",
                placeholder: def.placeholder || "",
                onchange: (event) => {
                    plugin.settings.store[key] = event.target.value;
                },
            }, String(value ?? ""))
            : h("input", {
                type: "text",
                value: String(value ?? ""),
                placeholder: def.placeholder || "",
                onchange: (event) => {
                    plugin.settings.store[key] = event.target.value;
                },
            });
    } else if (type === OptionType.COMPONENT) {
        control = h("div", { class: "omniyap-muted" }, "This option is managed by the plugin.");
    } else {
        control = h("span", { class: "omniyap-muted" }, String(value ?? ""));
    }

    return h("div", { class: "omniyap-option", style: def.multiline ? { display: "block" } : undefined },
        h("div", { class: "label" },
            h("b", {}, def.displayName || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())),
            def.description ? h("span", {}, def.description) : null,
        ),
        h("div", { style: def.multiline ? { marginTop: "6px" } : undefined }, control),
    );
}

function pluginCard(plugin) {
    const enabled = plugins.isEnabled(plugin.name);
    const error = plugins.errors.get(plugin.name);
    const hasOptions = Object.keys(plugin.settings?.definitions || {}).length > 0;
    const card = h("div", { class: "omniyap-card" + (openCards.has(plugin.name) ? " open" : "") },
        h("div", { class: "omniyap-card-head" },
            h("div", { class: "info" },
                h("div", { class: "name" },
                    plugin.name,
                    ...(plugin.tags || []).slice(0, 3).map((tag) => h("span", { class: "omniyap-tag" }, tag)),
                ),
                plugin.description ? h("div", { class: "desc" }, plugin.description) : null,
                (plugin.authors?.length || hasOptions)
                    ? h("div", { class: "meta" },
                        plugin.authors?.length ? h("span", {}, "by " + plugin.authors.map((a) => a.name || a).join(", ")) : null,
                        hasOptions ? h("button", {
                            class: "omniyap-reset",
                            onclick: () => {
                                if (openCards.has(plugin.name)) openCards.delete(plugin.name);
                                else openCards.add(plugin.name);
                                card.classList.toggle("open");
                            },
                        }, "Settings") : null,
                    )
                    : null,
                error ? h("div", { class: "omniyap-error" }, "Failed: " + (error.message || error)) : null,
            ),
            h("label", { class: "omniyap-switch" },
                h("input", {
                    type: "checkbox",
                    checked: enabled,
                    onchange: (event) => {
                        plugins.setEnabled(plugin.name, event.target.checked);
                        renderBody();
                    },
                }),
                h("span"),
            ),
        ),
        hasOptions
            ? h("div", { class: "omniyap-options" },
                ...Object.entries(plugin.settings.definitions).map(([key, def]) => optionRow(plugin, key, def)),
                h("button", {
                    class: "omniyap-reset",
                    onclick: () => {
                        plugin.settings.resetAll();
                        renderBody();
                    },
                }, "Reset all options for this plugin"),
            )
            : null,
    );
    return card;
}

function pluginsTab() {
    const all = plugins.list().sort((a, b) => a.name.localeCompare(b.name));
    const tags = [...new Set(all.flatMap((plugin) => plugin.tags || []))].sort();
    const query = search.trim().toLowerCase();
    const filtered = all.filter((plugin) => {
        if (category !== "all" && !(plugin.tags || []).includes(category)) return false;
        if (!query) return true;
        return `${plugin.name} ${plugin.description} ${(plugin.tags || []).join(" ")}`.toLowerCase().includes(query);
    });

    return h("div", {},
        h("div", { class: "omniyap-toolbar" },
            h("button", {
                class: "omniyap-pill" + (category === "all" ? " active" : ""),
                onclick: () => {
                    category = "all";
                    renderBody();
                },
            }, `All (${all.length})`),
            ...tags.slice(0, 12).map((tag) => h("button", {
                class: "omniyap-pill" + (category === tag ? " active" : ""),
                onclick: () => {
                    category = tag;
                    renderBody();
                },
            }, tag)),
            h("span", { class: "spacer", style: { flex: 1 } }),
            h("button", {
                class: "omniyap-btn",
                onclick: () => {
                    const enable = plugins.enabledCount() < all.length;
                    for (const plugin of all) plugins.setEnabled(plugin.name, enable);
                    renderBody();
                },
            }, plugins.enabledCount() < all.length ? "Enable all" : "Disable all"),
        ),
        filtered.length
            ? h("div", {}, filtered.map(pluginCard))
            : h("div", { class: "omniyap-empty" }, "No plugins match this search."),
    );
}

function themesTab() {
    const quickCss = settings.get("omniyap.quickCss", "") || "";
    const enabledFiles = new Set(settings.get("themes.enabled", []) || []);
    const links = settings.get("themes.links", []) || [];

    const editor = h("textarea", {
        class: "omniyap-css",
        spellcheck: false,
        placeholder: "/* Quick CSS — applied to Yapper immediately */",
    }, quickCss);

    return h("div", {},
        h("div", { class: "omniyap-sec" }, "Quick CSS"),
        h("div", { class: "omniyap-muted", style: { marginBottom: "8px" } },
            "Applied on top of Yapper. Use Yapper's CSS variables and classes; inspect the page for exact selectors."),
        editor,
        h("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } },
            h("button", {
                class: "omniyap-btn primary",
                onclick: async (event) => {
                    event.target.disabled = true;
                    await themes.setQuickCss(editor.value);
                    event.target.disabled = false;
                    dom.toast("Quick CSS applied", { type: "success" });
                },
            }, "Apply"),
            h("button", {
                class: "omniyap-btn",
                onclick: () => {
                    editor.value = "";
                    themes.setQuickCss("");
                },
            }, "Clear"),
        ),

        h("div", { class: "omniyap-sec" }, "Installed themes"),
        themes.available.length
            ? h("div", {}, themes.available.map((theme) => h("div", { class: "omniyap-row" },
                h("div", { class: "label" },
                    h("b", {}, theme.name || theme.fileName),
                    h("span", {}, `${(theme.size / 1024).toFixed(1)} KiB${theme.modified ? ` · ${formatDateTime(theme.modified)}` : ""}`),
                ),
                h("label", { class: "omniyap-switch" },
                    h("input", {
                        type: "checkbox",
                        checked: enabledFiles.has(theme.fileName),
                        onchange: async (event) => {
                            await themes.toggleFile(theme.fileName, event.target.checked);
                        },
                    }),
                    h("span"),
                ),
            )))
            : h("div", { class: "omniyap-muted" }, "No theme files yet. Import a .css file, or drop one into the themes folder."),
        h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } },
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    await native.themes.import();
                    await themes.list();
                    renderBody();
                },
            }, "Import theme…"),
            h("button", {
                class: "omniyap-btn",
                onclick: () => native.app.openPath("themes"),
            }, "Open themes folder"),
        ),

        h("div", { class: "omniyap-sec" }, "Theme links"),
        links.length
            ? h("div", {}, links.map((link) => h("div", { class: "omniyap-row" },
                h("div", { class: "label", style: { minWidth: 0 } },
                    h("b", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, link.url),
                ),
                h("label", { class: "omniyap-switch" },
                    h("input", {
                        type: "checkbox",
                        checked: !!link.enabled,
                        onchange: async (event) => {
                            await themes.toggleLink(link.url, event.target.checked);
                        },
                    }),
                    h("span"),
                ),
            )))
            : h("div", { class: "omniyap-muted" }, "No theme links. Add a raw https CSS URL below."),
        h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } },
            h("input", {
                class: "omniyap-search",
                style: { flex: 1, width: "auto" },
                placeholder: "https://example.com/theme.css",
                onkeydown: async (event) => {
                    if (event.key !== "Enter") return;
                    const url = event.target.value.trim();
                    if (!/^https:\/\//.test(url)) return dom.toast("Theme links must be https", { type: "error" });
                    try {
                        await themes.addLink(url, true);
                        event.target.value = "";
                        renderBody();
                    } catch (err) {
                        dom.toast(String(err.message || err), { type: "error" });
                    }
                },
            }),
            h("button", {
                class: "omniyap-btn",
                onclick: async (event) => {
                    const input = event.target.previousSibling;
                    const url = input.value.trim();
                    if (!/^https:\/\//.test(url)) return dom.toast("Theme links must be https", { type: "error" });
                    try {
                        await themes.addLink(url, true);
                        input.value = "";
                        renderBody();
                    } catch (err) {
                        dom.toast(String(err.message || err), { type: "error" });
                    }
                },
            }, "Add"),
        ),
    );
}

function toggleRow(title, description, value, onChange) {
    return h("div", { class: "omniyap-row" },
        h("div", { class: "label" }, h("b", {}, title), h("span", {}, description)),
        h("label", { class: "omniyap-switch" },
            h("input", { type: "checkbox", checked: !!value, onchange: (event) => onChange(event.target.checked) }),
            h("span"),
        ),
    );
}

function appTab() {
    const zoom = Number(settings.get("omniyap.zoom", 100));
    return h("div", {},
        h("div", { class: "omniyap-sec" }, "Window"),
        toggleRow("Start minimised", "Launch into the tray without showing the window.", settings.get("omniyap.startMinimized", false), (value) => settings.set("omniyap.startMinimized", value)),
        toggleRow("Keep running in the tray", "Closing the window hides it instead of quitting.", settings.get("omniyap.minimizeToTray", true), (value) => settings.set("omniyap.minimizeToTray", value)),
        toggleRow("Show tray icon", "The OmniYap icon in the system tray.", settings.get("omniyap.tray", true), (value) => settings.set("omniyap.tray", value)),
        h("div", { class: "omniyap-row" },
            h("div", { class: "label" }, h("b", {}, "Zoom"), h("span", {}, "Scale Yapper's interface.")),
            h("input", {
                type: "range", min: 50, max: 200, step: 5, value: zoom, style: { width: "180px" },
                oninput: (event) => {
                    const value = Number(event.target.value);
                    settings.set("omniyap.zoom", value);
                    native.ui.setZoom(value);
                },
            }),
        ),

        h("div", { class: "omniyap-sec" }, "Behaviour"),
        toggleRow("Native context menus", "Use the operating system's context menu for links, images and text.", settings.get("omniyap.nativeContextMenu", true), (value) => settings.set("omniyap.nativeContextMenu", value)),
        toggleRow("Spellcheck", "Underline misspelled words in the composer.", settings.get("omniyap.spellcheck", true), (value) => settings.set("omniyap.spellcheck", value)),
        toggleRow("Block YouTube ads", "Filter ad requests in embedded YouTube players.", settings.get("omniyap.blockYouTubeAds", false), (value) => settings.set("omniyap.blockYouTubeAds", value)),

        h("div", { class: "omniyap-sec" }, "Maintenance"),
        h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            h("button", { class: "omniyap-btn", onclick: () => native.app.reload() }, "Reload Yapper"),
            h("button", { class: "omniyap-btn", onclick: () => native.app.devtools() }, "Toggle DevTools"),
            h("button", { class: "omniyap-btn", onclick: () => native.app.openPath("data") }, "Open data folder"),
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    const text = JSON.stringify(plugins.diagnostics(), null, 2);
                    await native.saveDiagnostics(text);
                },
            }, "Save diagnostics"),
        ),
        h("div", { class: "omniyap-sec" }, "Settings backup"),
        h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    const blob = new Blob([JSON.stringify(settings.data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = h("a", { href: url, download: "omniyap-settings.json" });
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                },
            }, "Export settings"),
            (() => {
                const picker = h("input", {
                    type: "file", accept: ".json", style: { display: "none" },
                    onchange: async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                            const parsed = JSON.parse(await file.text());
                            await native.settings.patch(parsed);
                            dom.toast("Settings imported. Reload to apply everything.", { type: "success" });
                        } catch (err) {
                            dom.toast("Invalid settings file: " + (err.message || err), { type: "error" });
                        }
                    },
                });
                return [
                    picker,
                    h("button", {
                        class: "omniyap-btn",
                        onclick: () => picker.click(),
                    }, "Import settings"),
                ];
            })(),
        ),
    );
}

function diagnosticsTab() {
    const stats = finder.stats();
    const errors = [...plugins.errors.entries()];
    const patchReport = patches.report();
    return h("div", {},
        h("div", { class: "omniyap-sec" }, "Runtime"),
        h("div", { class: "omniyap-pre" }, [
            `OmniYap ${OmniYap.version} (${OmniYap.boot.mode})`,
            `Electron ${OmniYap.boot.electron || "—"}   Chrome ${OmniYap.boot.chrome || "—"}`,
            `Platform ${OmniYap.boot.platform}   Build ${OmniYap.boot.buildHash}`,
            `Yapper store: ${store.isReady ? "ready" : "not ready"}`,
            `Turbopack: ctx=${stats.ctxCaptured} factories=${stats.factories} instantiated=${stats.instantiated} hooked=${stats.hookInstalled}`,
            `Module factories wrapped: ${stats.factoriesWrapped}`,
            `Plugins: ${plugins.enabledCount()} enabled / ${plugins.list().length} installed`,
        ].join("\n")),

        h("div", { class: "omniyap-sec" }, "Plugin errors"),
        errors.length
            ? h("div", { class: "omniyap-pre" }, errors.map(([name, err]) => `${name}: ${err?.message || err}`).join("\n"))
            : h("div", { class: "omniyap-muted" }, "No plugin errors."),

        h("div", { class: "omniyap-sec" }, "Patches"),
        patchReport.length
            ? h("div", { class: "omniyap-pre" }, patchReport.map((patch) => `${patch.plugin}  applied=${patch.applied}${patch.failed.length ? "  failed=" + patch.failed.join("; ") : ""}`).join("\n"))
            : h("div", { class: "omniyap-muted" }, "No source patches registered."),

        h("div", { class: "omniyap-sec" }, "Recent log"),
        h("div", { class: "omniyap-pre" }, OmniYap.log.history().slice(-60).map((entry) => `[${entry.level}] ${entry.text}`).join("\n")),

        h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
            h("button", {
                class: "omniyap-btn",
                onclick: () => void dom.copy(JSON.stringify(plugins.diagnostics(), null, 2), "Diagnostics copied"),
            }, "Copy diagnostics"),
            h("button", { class: "omniyap-btn", onclick: () => renderBody() }, "Refresh"),
        ),
    );
}

function renderBody() {
    if (!root) return;
    const body = root.querySelector(".omniyap-body");
    if (!body) return;
    const titles = { plugins: "Plugins", tools: "Tools", themes: "Themes", app: "App settings", diagnostics: "Diagnostics" };
    const title = root.querySelector(".omniyap-head h2");
    if (title) title.textContent = titles[currentTab] || "OmniYap";
    const searchBox = root.querySelector(".omniyap-search");
    if (searchBox) searchBox.style.display = currentTab === "plugins" ? "" : "none";

    body.replaceChildren(
        currentTab === "plugins" ? pluginsTab()
            : currentTab === "tools" ? toolsTab()
                : currentTab === "themes" ? themesTab()
                    : currentTab === "app" ? appTab()
                        : diagnosticsTab(),
    );

    root.querySelectorAll(".omniyap-nav button").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === currentTab);
    });
    const foot = root.querySelector(".omniyap-side-foot");
    if (foot) foot.innerHTML = `<b>${plugins.enabledCount()}</b> of ${plugins.list().length} plugins enabled`;
}

export function open(page) {
    if (!document.getElementById("omniyap-ui-styles")) {
        const style = document.createElement("style");
        style.id = "omniyap-ui-styles";
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    if (!root) {
        const nav = h("div", { class: "omniyap-nav" }, TABS.map((tab) => h("button", {
            dataset: { tab: tab.id },
            onclick: () => {
                currentTab = tab.id;
                renderBody();
            },
        }, h("span", { class: "glyph" }, tab.glyph), tab.label)));

        const searchBox = h("input", {
            class: "omniyap-search",
            placeholder: "Search plugins…",
            value: search,
            oninput: (event) => {
                search = event.target.value;
                renderBody();
            },
        });

        root = h("div", { class: "omniyap-root", hidden: true },
            h("div", {
                class: "omniyap-scrim",
                onmousedown: (event) => {
                    if (event.target.classList.contains("omniyap-scrim")) close();
                },
            }),
            h("div", { class: "omniyap-panel", role: "dialog", "aria-label": "OmniYap settings" },
                h("div", { class: "omniyap-side" },
                    h("div", { class: "omniyap-brand" },
                        h("img", { class: "omniyap-logo", src: logoUrl, alt: "OmniYap" }),
                        h("div", {}, h("b", {}, "OmniYap"), h("span", {}, `v${OmniYap.version}`)),
                    ),
                    nav,
                    h("div", { class: "omniyap-side-foot" }, ""),
                ),
                h("div", { class: "omniyap-main" },
                    h("div", { class: "omniyap-head" },
                        h("h2", {}, "Plugins"),
                        searchBox,
                        h("span", { class: "spacer" }),
                        h("button", { class: "omniyap-close", onclick: close, title: "Close" }, "×"),
                    ),
                    h("div", { class: "omniyap-body" }),
                ),
            ),
        );
        document.body.appendChild(root);

        root.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                close();
            }
        });
    }

    if (page) currentTab = page;
    root.hidden = false;
    renderBody();
    root.querySelector(".omniyap-search")?.focus();
}

export function close() {
    if (root) root.hidden = true;
}

export function toggle() {
    if (!root || root.hidden) open();
    else close();
}

export const isOpen = () => !!root && !root.hidden;

/** Add the OmniYap launcher to Yapper's user bar and listen for the tray shortcut. */
export function injectLauncher() {
    const add = () => {
        const bar = document.querySelector(".user-bar");
        if (!bar || bar.querySelector(".omniyap-launch")) return;
        const button = h("button", {
            class: "omniyap-launch",
            title: "OmniYap settings (Ctrl+,)",
            "aria-label": "OmniYap settings",
            onclick: (event) => {
                event.preventDefault();
                event.stopPropagation();
                open();
            },
        }, "OY");
        bar.appendChild(button);
    };
    dom.watch(".user-bar", add);
    window.addEventListener("omniyap:open-settings", () => open());
    window.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key === ",") {
            event.preventDefault();
            toggle();
        }
    }, true);
}

const ui = { open, close, toggle, isOpen, injectLauncher, render: renderBody, registerTool, tools };
OmniYap.ui = ui;
export default ui;
