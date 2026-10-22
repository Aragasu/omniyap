import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    truncate: { type: OptionType.SLIDER, description: "Maximum URL characters shown.", default: 90, min: 40, max: 200, step: 10 },
});

export default definePlugin({
    name: "LinkDestination",
    description: "Shows the real destination of a link in a small bar while you hover it, so masked links cannot surprise you.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "utility"],
    settings,

    start(ctx) {
        let pill = null;

        const hide = () => {
            pill?.remove();
            pill = null;
        };

        const onOver = (event) => {
            if (!(event.target instanceof Element)) return;
            const link = event.target.closest("a[href]");
            if (!link || !event.target.closest(".messages, .msg-text")) return;
            let url;
            try {
                url = new URL(link.getAttribute("href"), location.href);
            } catch {
                return;
            }
            if (!/^https?:$/.test(url.protocol)) return;
            const limit = Math.max(40, Math.min(200, Number(settings.store.truncate) || 90));
            const text = url.href.length > limit ? `${url.href.slice(0, limit)}…` : url.href;
            pill?.remove();
            pill = h("div", { class: "omniyap-link-pill" },
                h("span", { class: "omniyap-link-host" }, url.hostname.replace(/^www\./, "")),
                h("span", { class: "omniyap-link-url" }, text),
            );
            document.body.appendChild(pill);
        };

        const onOut = (event) => {
            if (event.target instanceof Element && event.target.closest("a[href]")) hide();
        };

        document.addEventListener("mouseover", onOver);
        document.addEventListener("mouseout", onOut);
        window.addEventListener("scroll", hide, true);
        ctx.cleanup(() => {
            document.removeEventListener("mouseover", onOver);
            document.removeEventListener("mouseout", onOut);
            window.removeEventListener("scroll", hide, true);
            hide();
        });
        ctx.css(`
            .omniyap-link-pill{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:2147483000;
                display:flex;align-items:center;gap:8px;max-width:80vw;background:rgba(20,20,28,.96);
                border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;
                box-shadow:0 8px 26px rgba(0,0,0,.45);pointer-events:none}
            .omniyap-link-host{font:700 10.5px Inter,system-ui,sans-serif;color:#c48bff;white-space:nowrap}
            .omniyap-link-url{font:400 10.5px ui-monospace,monospace;color:#9295a2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        `);
    },
});
