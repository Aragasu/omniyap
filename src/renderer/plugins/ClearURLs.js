import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { messages } from "./_shared.js";

const settings = definePluginSettings({
    onCopy: {
        type: OptionType.BOOLEAN,
        description: "Also clean URLs copied from messages.",
        default: true,
    },
});

const TRACKING = [
    /^utm_/i, /^fbclid$/i, /^gclid$/i, /^dclid$/i, /^msclkid$/i, /^igshid$/i, /^si$/i,
    /^ref$/i, /^ref_src$/i, /^ref_url$/i, /^spm$/i, /^mc_cid$/i, /^mc_eid$/i, /^_hsenc$/i,
    /^vero_id$/i, /^wickedid$/i, /^yclid$/i, /^s_cid$/i, /^mkt_tok$/i, /^trk$/i, /^sc_cid$/i,
];

export function cleanUrl(raw) {
    try {
        const url = new URL(raw);
        const remove = [];
        for (const key of url.searchParams.keys()) {
            if (TRACKING.some((pattern) => pattern.test(key))) remove.push(key);
        }
        remove.forEach((key) => url.searchParams.delete(key));
        return url.toString();
    } catch {
        return raw;
    }
}

export default definePlugin({
    name: "ClearURLs",
    description: "Removes utm_*, fbclid and other tracking parameters from links.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "utility"],
    settings,

    start(ctx) {
        const cleanLinks = ({ textEl }) => {
            textEl?.querySelectorAll("a[href]").forEach((link) => {
                const cleaned = cleanUrl(link.href);
                if (cleaned !== link.href) {
                    link.dataset.omniyapOriginalHref = link.href;
                    link.href = cleaned;
                }
            });
        };

        ctx.cleanup(messages.decorate(cleanLinks));

        const onClick = (event) => {
            const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
            if (!link) return;
            const cleaned = cleanUrl(link.href);
            if (cleaned !== link.href) link.href = cleaned;
        };
        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));

        if (settings.store.onCopy) {
            const onCopyEvent = (event) => {
                const selection = String(window.getSelection() || "");
                if (!selection || !/^https?:\/\//.test(selection.trim())) return;
                const cleaned = cleanUrl(selection.trim());
                if (cleaned === selection.trim()) return;
                event.clipboardData?.setData("text/plain", cleaned);
                event.preventDefault();
            };
            document.addEventListener("copy", onCopyEvent, true);
            ctx.cleanup(() => document.removeEventListener("copy", onCopyEvent, true));
        }
    },
});
