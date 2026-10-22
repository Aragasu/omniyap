import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    limit: { type: OptionType.SLIDER, description: "How many commands to list at once.", default: 8, min: 3, max: 14, step: 1 },
});

function normalize(raw) {
    const list = [];
    const add = (name, description) => {
        const clean = String(name || "").replace(/^\//, "").trim();
        if (!clean || list.some((entry) => entry.name === clean)) return;
        list.push({ name: clean, description: String(description || "").trim() });
    };
    if (Array.isArray(raw)) {
        for (const entry of raw) {
            if (typeof entry === "string") add(entry, "");
            else if (entry) add(entry.name || entry.command || entry.id, entry.description || entry.desc || entry.help);
        }
    } else if (raw && typeof raw === "object") {
        for (const [key, value] of Object.entries(raw)) {
            if (Array.isArray(value)) {
                for (const entry of value) {
                    if (typeof entry === "string") add(entry, "");
                    else if (entry) add(entry.name || entry.command || entry.id || key, entry.description || entry.desc || entry.help);
                }
            } else if (typeof value === "string") add(key, value);
            else if (value && typeof value === "object") add(value.name || value.command || key, value.description || value.desc || value.help);
        }
    }
    return list;
}

export default definePlugin({
    name: "SlashCommandHints",
    description: "Shows the server's bot commands with descriptions while you type a slash command, and inserts the one you pick.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let popup = null;
        let matches = [];
        let selected = 0;
        let token = null;
        let commands = normalize(store.getState()?.botCommands);

        const close = () => {
            popup?.remove();
            popup = null;
            matches = [];
            token = null;
        };

        const apply = (composer, entry) => {
            if (!token) return;
            const value = composer.value;
            const insert = `/${entry.name} `;
            const next = value.slice(0, token.start) + insert + value.slice(token.end);
            setNativeValue(composer, next);
            const caret = token.start + insert.length;
            composer.focus();
            composer.setSelectionRange?.(caret, caret);
            close();
        };

        const render = (composer) => {
            if (!popup) {
                popup = h("div", { class: "omniyap-cmd-pop", role: "listbox", "aria-label": "Bot commands" });
                document.body.appendChild(popup);
                popup.addEventListener("mousedown", (event) => {
                    const button = event.target instanceof Element ? event.target.closest("button[data-index]") : null;
                    if (!button) return;
                    event.preventDefault();
                    const entry = matches[Number(button.dataset.index)];
                    if (entry) apply(composer, entry);
                });
            }
            const rect = composer.getBoundingClientRect();
            popup.style.left = `${Math.max(8, Math.min(window.innerWidth - 330, rect.left + 10))}px`;
            popup.style.top = `${Math.max(8, rect.top - Math.min(360, matches.length * 44 + 36))}px`;
            popup.replaceChildren(
                h("div", { class: "omniyap-cmd-head" }, "Bot commands"),
                ...matches.map((entry, index) => h("button", {
                    type: "button",
                    class: "omniyap-cmd-item" + (index === selected ? " active" : ""),
                    "data-index": index,
                    role: "option",
                    "aria-selected": String(index === selected),
                },
                    h("span", { class: "omniyap-cmd-name" }, `/${entry.name}`),
                    entry.description ? h("span", { class: "omniyap-cmd-desc" }, entry.description) : null,
                )),
                h("div", { class: "omniyap-cmd-foot" }, "Tab or Enter to insert"),
            );
        };

        const update = () => {
            const composer = getComposer();
            if (!composer) return close();
            commands = normalize(store.getState()?.botCommands);
            if (!commands.length) return close();
            const caret = composer.selectionStart ?? composer.value.length;
            const before = composer.value.slice(0, caret);
            const match = /(^|\s)\/([a-z0-9_-]{0,32})$/i.exec(before);
            if (!match) return close();
            const query = match[2].toLowerCase();
            matches = commands
                .filter((entry) => entry.name.toLowerCase().startsWith(query))
                .slice(0, Math.max(3, Math.min(14, Number(settings.store.limit) || 8)));
            if (!matches.length) return close();
            selected = Math.min(selected, matches.length - 1);
            token = { start: caret - query.length - 1, end: caret };
            render(composer);
        };

        const onInput = (event) => {
            if (event.target !== getComposer()) return;
            selected = 0;
            update();
        };

        const onKey = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer || !popup) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                event.stopPropagation();
                selected = (selected + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
                render(composer);
            } else if (event.key === "Tab" || event.key === "Enter") {
                if (!matches[selected]) return;
                event.preventDefault();
                event.stopPropagation();
                apply(composer, matches[selected]);
            }
        };

        document.addEventListener("input", onInput, true);
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("input", onInput, true);
            document.removeEventListener("keydown", onKey, true);
            close();
        });

        ctx.css(`
            .omniyap-cmd-pop{position:fixed;z-index:2147483100;width:320px;max-height:360px;overflow:auto;background:#1b1b26;
                border:1px solid rgba(255,255,255,.1);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:5px}
            .omniyap-cmd-head{font:700 10px Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:#7c7f8c;padding:5px 8px}
            .omniyap-cmd-item{display:flex;flex-direction:column;gap:1px;width:100%;border:0;background:transparent;color:#d9dae0;
                border-radius:7px;padding:6px 8px;cursor:pointer;text-align:left}
            .omniyap-cmd-item.active,.omniyap-cmd-item:hover{background:rgba(139,57,253,.22)}
            .omniyap-cmd-name{font:650 12.5px Inter,system-ui,sans-serif;color:#e5d8ff}
            .omniyap-cmd-desc{font:400 11px Inter,system-ui,sans-serif;color:#9496a1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .omniyap-cmd-foot{font:500 10px Inter,system-ui,sans-serif;color:#666977;padding:6px 8px 3px;border-top:1px solid rgba(255,255,255,.05);margin-top:3px}
        `);
    },
});
