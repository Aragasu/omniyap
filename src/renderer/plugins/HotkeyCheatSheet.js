import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    shortcut: { type: OptionType.BOOLEAN, description: "Ctrl+Shift+/ opens the cheat sheet.", default: true },
});

const GROUPS = [
    ["OmniYap", [
        ["Ctrl+,", "Open OmniYap settings"],
        ["Ctrl+Shift+/", "This cheat sheet"],
        ["Ctrl+Shift+P", "Party mode confetti"],
        ["Ctrl+Shift+G", "Search the selected text"],
        ["Ctrl+=  /  Ctrl+-  /  Ctrl+0", "Zoom in, out, reset"],
    ]],
    ["Chat", [
        ["Ctrl+K", "Quick channel switcher"],
        ["Ctrl+F", "Filter the message list"],
        ["Middle-click a message", "Quote it into the composer"],
        ["Shift-click a message", "Copy its text"],
        ["Alt-click a name", "Mention that person"],
    ]],
];

function table(rows) {
    return h("div", { class: "omniyap-keys" },
        ...rows.map(([keys, what]) => h("div", { class: "omniyap-key-row" },
            h("kbd", { class: "omniyap-key" }, keys),
            h("span", { class: "omniyap-key-what" }, what),
        )),
    );
}

export default definePlugin({
    name: "HotkeyCheatSheet",
    description: "Lists OmniYap and chat keyboard shortcuts in one modal, reachable from a tool entry or Ctrl+Shift+/.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "keyboard"],
    settings,

    start(ctx) {
        const open = () => {
            openModal({
                title: "Keyboard shortcuts",
                subtitle: "OmniYap and Yapper",
                width: 560,
                body: h("div", { class: "omniyap-sheet" },
                    ...GROUPS.map(([group, rows], index) => h("section", { class: index ? "omniyap-sheet-group" : "" },
                        h("h4", { class: "omniyap-sheet-title" }, group),
                        table(rows),
                    )),
                ),
            });
        };

        const onKey = (event) => {
            if (!settings.store.shortcut) return;
            if (!event.ctrlKey || !event.shiftKey || event.key !== "?") return;
            event.preventDefault();
            open();
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
        ctx.cleanup(ui.registerTool({
            id: "hotkey-sheet",
            label: "Keyboard shortcuts",
            icon: "⌘",
            description: "Every OmniYap shortcut in one list.",
            onClick: open,
        }));
        ctx.css(`
            .omniyap-sheet-group{margin-top:16px}
            .omniyap-sheet-title{margin:0 0 6px;font:600 11px Inter,system-ui,sans-serif;letter-spacing:.08em;
                text-transform:uppercase;color:#8b8d98}
            .omniyap-keys{display:flex;flex-direction:column;gap:2px}
            .omniyap-key-row{display:flex;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)}
            /* Fixed key column: long combos wrap inside it instead of crowding the description. */
            .omniyap-key{flex:0 0 150px;width:150px;font:600 11px ui-monospace,SFMono-Regular,monospace;color:#d9c2ff;
                background:rgba(139,57,253,.12);border:1px solid rgba(139,57,253,.25);border-radius:5px;padding:3px 6px;
                line-height:1.45;overflow-wrap:anywhere}
            .omniyap-key-what{flex:1;min-width:0;color:#c3c5cf;font-size:12.5px}
            @media (max-width: 560px){
                .omniyap-key-row{flex-wrap:wrap;gap:2px 12px;padding:6px 0}
                .omniyap-key{flex:1 1 auto;width:auto}
                .omniyap-key-what{flex:1 1 100%}
            }
        `);
    },
});
