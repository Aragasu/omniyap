import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    shortcut: { type: OptionType.BOOLEAN, description: "Ctrl+Alt+F opens the filter.", default: true },
});

export default definePlugin({
    name: "InlineChatFilter",
    description: "Filters the visible conversation as you type: only messages containing the phrase stay on screen. Ctrl+Alt+F opens it.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "navigation", "utility"],
    settings,

    start(ctx) {
        let bar = null;
        let input = null;
        let count = null;

        const apply = () => {
            const query = (input?.value || "").trim().toLowerCase();
            let shown = 0;
            document.querySelectorAll(messages.selector).forEach((row) => {
                const match = !query || row.innerText.toLowerCase().includes(query);
                row.classList.toggle("omniyap-filtered-out", !match);
                if (match) shown++;
            });
            if (count) count.textContent = query ? `${shown} shown` : "";
        };

        const close = () => {
            bar?.remove();
            bar = null;
            input = null;
            count = null;
            document.querySelectorAll(".omniyap-filtered-out").forEach((row) => row.classList.remove("omniyap-filtered-out"));
        };

        const open = () => {
            if (bar) {
                close();
                return;
            }
            const wrap = document.querySelector(".chat-wrap, .chat");
            if (!wrap) return;
            input = h("input", {
                class: "omniyap-filter-input",
                placeholder: "Filter the conversation…",
                "aria-label": "Filter messages",
                oninput: apply,
                onkeydown: (event) => {
                    if (event.key === "Escape") close();
                },
            });
            count = h("span", { class: "omniyap-filter-count" });
            bar = h("div", { class: "omniyap-filter-bar" },
                h("span", { class: "omniyap-filter-icon" }, "⌕"),
                input,
                count,
                h("button", { class: "omniyap-filter-close", title: "Close", onclick: close }, "×"),
            );
            wrap.prepend(bar);
            input.focus();
        };

        const onKey = (event) => {
            if (!settings.store.shortcut) return;
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "f") {
                event.preventDefault();
                event.stopPropagation();
                open();
            }
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            close();
        });
        ctx.css(`
            .omniyap-filter-bar{display:flex;align-items:center;gap:8px;margin:8px 12px 4px;padding:7px 10px;border-radius:9px;
                background:#1b1b26;border:1px solid rgba(139,57,253,.35);position:relative;z-index:5;flex:none}
            .omniyap-filter-icon{color:#b57bff;font-size:15px}
            .omniyap-filter-input{flex:1;min-width:0;border:0;background:transparent;color:#ececf1;outline:none;
                font:500 12.5px Inter,system-ui,sans-serif}
            .omniyap-filter-count{font:500 10.5px Inter,system-ui,sans-serif;color:#8b8d98;white-space:nowrap}
            .omniyap-filter-close{border:0;background:transparent;color:#8b8d98;font-size:16px;cursor:pointer;line-height:1}
            .omniyap-filter-close:hover{color:#fff}
            .msg.omniyap-filtered-out{display:none!important}
        `);
    },
});
