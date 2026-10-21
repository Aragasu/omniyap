import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    showIcon: {
        type: OptionType.BOOLEAN,
        description: "Show a small indicator in the composer while typing is suppressed.",
        default: true,
    },
});

// Yapper sends typing state over its realtime socket. Intercepting send() is the least invasive way
// to stop it without touching Yapper's own modules: only frames that mention typing are dropped.
export default definePlugin({
    name: "SilentTyping",
    description: "Stop sending typing indicators to other people.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "chat"],
    settings,

    start(ctx) {
        const sockets = new Set();
        const NativeWebSocket = window.WebSocket;
        let dropped = 0;

        const looksLikeTyping = (data) => {
            if (typeof data !== "string") {
                if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                    try {
                        return /typing/i.test(new TextDecoder().decode(data));
                    } catch {
                        return false;
                    }
                }
                return false;
            }
            return /"(typing|is_typing|typing_start|typing_stop|start_typing|stop_typing)"\s*:/i.test(data)
                || /\["typing"|"typing",|typing_start|typing_stop/i.test(data);
        };

        class SilentWebSocket extends NativeWebSocket {
            constructor(...args) {
                super(...args);
                sockets.add(this);
                this.addEventListener("close", () => sockets.delete(this));
            }

            send(data) {
                if (looksLikeTyping(data)) {
                    dropped++;
                    window.dispatchEvent(new CustomEvent("omniyap:typing-suppressed", { detail: dropped }));
                    return;
                }
                return super.send(data);
            }
        }

        try {
            Object.defineProperty(window, "WebSocket", {
                configurable: true,
                writable: true,
                value: SilentWebSocket,
            });
        } catch (err) {
            ctx.log.error("could not wrap WebSocket", err);
        }

        let badge = null;
        const onSuppressed = () => {
            if (!settings.store.showIcon) return;
            if (!badge) {
                const box = document.querySelector(".composer-box");
                if (!box) return;
                badge = document.createElement("span");
                badge.className = "omniyap-silent-badge";
                badge.textContent = "typing off";
                badge.title = "SilentTyping is suppressing your typing indicator";
                box.appendChild(badge);
            }
            badge.classList.add("pulse");
            setTimeout(() => badge?.classList.remove("pulse"), 600);
        };
        window.addEventListener("omniyap:typing-suppressed", onSuppressed);

        ctx.css(`
            .omniyap-silent-badge{position:absolute;left:46px;bottom:7px;font:600 9.5px Inter,system-ui,sans-serif;
                color:#b57bff;background:rgba(139,57,253,.12);border:1px solid rgba(139,57,253,.3);
                padding:1px 6px;border-radius:999px;pointer-events:none}
            .omniyap-silent-badge.pulse{background:rgba(139,57,253,.3)}
            .composer-box{position:relative}
        `);

        ctx.cleanup(() => {
            window.removeEventListener("omniyap:typing-suppressed", onSuppressed);
            badge?.remove();
            try {
                window.WebSocket = NativeWebSocket;
            } catch {
                /* ignore */
            }
            sockets.clear();
        });

        ctx.log.info("outgoing typing frames will be dropped");
    },
});
