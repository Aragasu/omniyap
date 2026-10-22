import { definePlugin, definePluginSettings, OptionType, store, messages as messageApi } from "../core/api.js";
import { h, formatTime } from "./_shared.js";

const settings = definePluginSettings({
    delay: { type: OptionType.SLIDER, description: "Hover delay in milliseconds.", default: 260, min: 0, max: 1000, step: 20 },
    width: { type: OptionType.SLIDER, description: "Preview width in pixels.", default: 360, min: 240, max: 560, step: 20 },
});

function linkTarget(anchor) {
    try {
        const url = new URL(anchor.getAttribute("href") || "", location.href);
        const channel = url.searchParams.get("channel");
        const message = url.searchParams.get("message") || url.searchParams.get("m");
        return message ? { channel, message } : null;
    } catch {
        return null;
    }
}

export default definePlugin({
    name: "MessagePeek",
    description: "Hover a link to another message to see a preview without leaving the channel.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "navigation"],
    settings,

    start(ctx) {
        let popover = null;
        let timer = null;

        const hide = () => {
            clearTimeout(timer);
            timer = null;
            popover?.remove();
            popover = null;
        };

        const show = (anchor, target) => {
            const message = store.findMessage(target.message);
            const rect = anchor.getBoundingClientRect();
            popover?.remove();
            popover = h("div", { class: "omniyap-peek", role: "tooltip" },
                message ? h("div", {},
                    h("div", { class: "head" },
                        h("b", {}, store.displayName(message.author_id || message.user_id) || "Unknown"),
                        h("span", {}, message.created_at ? formatTime(message.created_at) : ""),
                    ),
                    h("div", { class: "text" }, String(messageApi.content(message) || "(no text)").slice(0, 600)),
                    h("div", { class: "foot" }, `#${store.channelName(target.channel) || "channel"}`),
                ) : h("div", { class: "muted" }, "That message is not loaded yet. Open the link to jump to it."),
            );
            popover.style.width = `${Math.max(240, Math.min(560, Number(settings.store.width) || 360))}px`;
            (document.body || document.documentElement).append(popover);
            const top = rect.bottom + 8 + popover.offsetHeight > innerHeight ? rect.top - popover.offsetHeight - 8 : rect.bottom + 8;
            popover.style.top = `${Math.max(8, top)}px`;
            popover.style.left = `${Math.max(8, Math.min(innerWidth - popover.offsetWidth - 8, rect.left))}px`;
        };

        const onOver = (event) => {
            const anchor = event.target instanceof Element ? event.target.closest('.msg-text a[href*="message="], .msg-text a[href*="?m="]') : null;
            if (!anchor) return;
            const target = linkTarget(anchor);
            if (!target) return;
            clearTimeout(timer);
            timer = setTimeout(() => show(anchor, target), Math.max(0, Number(settings.store.delay) || 0));
        };
        const onOut = (event) => {
            if (event.target instanceof Element && event.target.closest('.msg-text a[href*="message="]')) hide();
        };

        document.addEventListener("mouseover", onOver, true);
        document.addEventListener("mouseout", onOut, true);
        document.addEventListener("scroll", hide, true);
        ctx.cleanup(() => {
            document.removeEventListener("mouseover", onOver, true);
            document.removeEventListener("mouseout", onOut, true);
            document.removeEventListener("scroll", hide, true);
            hide();
        });
        ctx.css(`
            .omniyap-peek{position:fixed;z-index:2147483100;padding:10px 12px;border-radius:10px;background:#1b1b26;
                border:1px solid rgba(139,57,253,.3);box-shadow:0 14px 40px rgba(0,0,0,.55);pointer-events:none;
                color:#d6d7de;font:12px/1.45 Inter,system-ui,sans-serif}
            .omniyap-peek .head{display:flex;justify-content:space-between;gap:10px;margin-bottom:4px;color:#8b8d98;font-size:10.5px}
            .omniyap-peek .head b{color:#d9c2ff}
            .omniyap-peek .text{white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:hidden}
            .omniyap-peek .foot{margin-top:6px;color:#71737e;font-size:10px}
            .omniyap-peek .muted{color:#8b8d98}
        `);
    },
});
