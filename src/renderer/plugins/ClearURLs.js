// Uses the real ClearURLs rule set (https://github.com/ClearURLs/Rules, data.min.json), the same
// database the ClearURLs browser extension ships, and the same provider-matching logic Vencord's
// ClearURLs plugin uses. The short list below is only an offline fallback for the common trackers.
import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { messages } from "./_shared.js";

const RULES_URL = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";
const RULES_TTL = 24 * 60 * 60 * 1000;

const FALLBACK = [
    /^utm_/i, /^fbclid$/i, /^gclid$/i, /^dclid$/i, /^msclkid$/i, /^igshid$/i, /^si$/i,
    /^ref$/i, /^ref_src$/i, /^ref_url$/i, /^spm$/i, /^mc_cid$/i, /^mc_eid$/i, /^_hsenc$/i,
    /^vero_id$/i, /^wickedid$/i, /^yclid$/i, /^s_cid$/i, /^mkt_tok$/i, /^trk$/i, /^sc_cid$/i,
];

const settings = definePluginSettings({
    onCopy: {
        type: OptionType.BOOLEAN,
        description: "Also clean URLs copied from messages.",
        default: true,
    },
});

let rules = [];
let loadedAt = 0;

function toRuleSet(data) {
    const next = [];
    for (const [name, provider] of Object.entries(data?.providers || {})) {
        try {
            next.push({
                name,
                urlPattern: new RegExp(provider.urlPattern, "i"),
                rules: provider.rules?.map((rule) => new RegExp(rule, "i")),
                rawRules: provider.rawRules?.map((rule) => new RegExp(rule, "i")),
                exceptions: provider.exceptions?.map((rule) => new RegExp(rule, "i")),
            });
        } catch {
            // A provider with a pattern this engine cannot compile is skipped, not fatal.
        }
    }
    return next;
}

/** Removes tracking parameters using the ClearURLs rule set. */
export function cleanUrl(raw) {
    let url;
    try {
        url = new URL(raw);
    } catch {
        return raw;
    }
    if (url.searchParams.entries().next().done) return raw;

    if (!rules.length) {
        let removed = false;
        for (const key of [...url.searchParams.keys()]) {
            if (FALLBACK.some((pattern) => pattern.test(key))) {
                url.searchParams.delete(key);
                removed = true;
            }
        }
        return removed ? url.toString() : raw;
    }

    // Only return a rewritten URL when something was actually stripped: serialising an untouched URL
    // adds a trailing slash and re-encodes the query, which would silently change plain links.
    let changed = false;

    for (const { urlPattern, exceptions, rawRules, rules: params } of rules) {
        if (!urlPattern.test(url.href) || exceptions?.some((rule) => rule.test(url.href))) continue;

        const toDelete = [];
        if (params) {
            url.searchParams.forEach((_, param) => {
                if (params.some((rule) => rule.test(param))) toDelete.push(param);
            });
        }
        if (toDelete.length) {
            toDelete.forEach((param) => url.searchParams.delete(param));
            changed = true;
        }

        if (rawRules?.length) {
            let cleaned = url.href;
            let touched = false;
            rawRules.forEach((rule) => {
                const next = cleaned.replace(rule, "");
                if (next !== cleaned) touched = true;
                cleaned = next;
            });
            if (touched) {
                try {
                    url = new URL(cleaned);
                    changed = true;
                } catch {
                    return raw;
                }
            }
        }
    }
    return changed ? url.toString() : raw;
}

export default definePlugin({
    name: "ClearURLs",
    description: "Strips tracking parameters from links using the ClearURLs rule set.",
    authors: [{ name: "adryd" }, { name: "thororen" }, { name: "OmniYap" }],
    tags: ["privacy", "utility"],
    settings,

    start(ctx) {
        let alive = true;

        const loadRules = async () => {
            if (rules.length && Date.now() - loadedAt < RULES_TTL) return;
            try {
                const response = await fetch(RULES_URL, { cache: "force-cache" });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const next = toRuleSet(await response.json());
                if (!next.length) throw new Error("empty rule set");
                if (!alive) return;
                rules = next;
                loadedAt = Date.now();
                // Rows rendered while the download was in flight were only cleaned by the fallback
                // list, so decorate them again with the full rule set.
                messages.refresh();
            } catch (error) {
                if (alive) OmniYap.log.warn("ClearURLs could not load its rule set, using the fallback list", error);
            }
        };
        ctx.cleanup(() => {
            alive = false;
            rules = [];
            loadedAt = 0;
        });
        loadRules();

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

        // The listener stays attached so toggling the setting takes effect without a restart.
        const onCopyEvent = (event) => {
            if (!settings.store.onCopy) return;
            const selection = String(window.getSelection() || "");
            if (!selection || !/^https?:\/\//.test(selection.trim())) return;
            const cleaned = cleanUrl(selection.trim());
            if (cleaned === selection.trim()) return;
            event.clipboardData?.setData("text/plain", cleaned);
            event.preventDefault();
        };
        document.addEventListener("copy", onCopyEvent, true);
        ctx.cleanup(() => document.removeEventListener("copy", onCopyEvent, true));
    },
});
