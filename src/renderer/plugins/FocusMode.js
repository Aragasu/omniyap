import { definePlugin, dom } from "../core/api.js";
import { h } from "./_shared.js";

export default definePlugin({
    name: "FocusMode",
    description: "Hides the server list, sidebar and member panel. Ctrl+Shift+F toggles it.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat"],

    start(ctx) {
        let enabled = false;
        let pill = null;

        const apply = () => {
            document.body.classList.toggle("omniyap-focus-mode", enabled);
            if (enabled && !pill) {
                pill = h("button", {
                    class: "omniyap-focus-pill",
                    title: "Leave focus mode (Ctrl+Shift+F)",
                    onclick: () => toggle(),
                }, "◱ Focus mode");
                document.body.appendChild(pill);
            } else if (!enabled && pill) {
                pill.remove();
                pill = null;
            }
        };

        const toggle = () => {
            enabled = !enabled;
            apply();
            dom.toast(enabled ? "Focus mode on" : "Focus mode off");
            localStorage.setItem("omniyap:focus-mode", enabled ? "1" : "0");
        };

        ctx.css(`
            body.omniyap-focus-mode .rail,
            body.omniyap-focus-mode .sidebar,
            body.omniyap-focus-mode .side-panel,
            body.omniyap-focus-mode .user-bar { display: none !important; }
            body.omniyap-focus-mode .chat-wrap { grid-template-columns: 1fr !important; }
            .omniyap-focus-pill{position:fixed;top:12px;left:12px;z-index:2147482000;padding:6px 11px;border-radius:999px;
                border:1px solid rgba(139,57,253,.4);background:rgba(139,57,253,.14);color:#d9c2ff;
                font:600 11px Inter,system-ui,sans-serif;cursor:pointer}
            .omniyap-focus-pill:hover{background:rgba(139,57,253,.26)}
        `);

        const onKey = (event) => {
            if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== "f") return;
            event.preventDefault();
            toggle();
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.body.classList.remove("omniyap-focus-mode");
            pill?.remove();
        });
    },
});
