import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    toasts: { type: OptionType.BOOLEAN, description: "Show a toast when the connection comes back.", default: true },
});

export default definePlugin({
    name: "NetworkStatus",
    description: "Shows a clear banner while you are offline and confirms when the connection returns, instead of silently failing to send.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "chat"],
    settings,

    start(ctx) {
        let banner = null;

        const render = () => {
            const online = navigator.onLine;
            if (online) {
                banner?.remove();
                banner = null;
                return;
            }
            if (!banner || !banner.isConnected) {
                banner = h("div", { class: "omniyap-offline", role: "status", "aria-live": "assertive" },
                    h("span", { class: "omniyap-offline-dot" }),
                    "You are offline. Messages will not send until the connection is back.",
                );
                document.body.appendChild(banner);
            }
        };

        const onOffline = () => render();
        const onOnline = () => {
            render();
            if (settings.store.toasts) ctx.toast("Back online", { type: "success", duration: 2200 });
        };

        window.addEventListener("offline", onOffline);
        window.addEventListener("online", onOnline);
        ctx.cleanup(() => {
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("online", onOnline);
            banner?.remove();
        });
        ctx.css(`
            .omniyap-offline{position:fixed;top:0;left:0;right:0;z-index:2147483100;display:flex;align-items:center;
                justify-content:center;gap:8px;background:#5c1f24;color:#ffd9dc;border-bottom:1px solid #e5484d;
                font:600 12px Inter,system-ui,sans-serif;padding:6px 12px;pointer-events:none}
            .omniyap-offline-dot{width:7px;height:7px;border-radius:50%;background:#ff6b6b;animation:omniyap-offline-pulse 1.2s infinite}
            @keyframes omniyap-offline-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        `);
        render();
    },
});
