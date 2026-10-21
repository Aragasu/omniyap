import { definePlugin, definePluginSettings, OptionType, messages, store } from "../core/api.js";
import { h, QUICK_REACTIONS, addMessageAction } from "./_shared.js";

const settings = definePluginSettings({
    emojis: {
        type: OptionType.STRING,
        description: "Comma-separated list of quick reactions.",
        default: QUICK_REACTIONS.join(" "),
    },
});

function quickList() {
    const raw = String(settings.store.emojis || "").replace(/,/g, " ");
    const list = raw.split(/\s+/).filter(Boolean);
    return list.length ? list.slice(0, 8) : QUICK_REACTIONS;
}

export default definePlugin({
    name: "MoreQuickReactions",
    description: "Adds a row of one-click reactions to every message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "reactions"],
    settings,

    start(ctx) {
        const react = async (row, emoji) => {
            const id = row.getAttribute("data-message-id");
            const live = store.live();
            // Yapper's action is `toggleReaction(messageId, emoji)`.
            try {
                if (typeof live?.toggleReaction === "function") {
                    const result = live.toggleReaction(id, emoji);
                    if (result && typeof result.catch === "function") await result;
                    return true;
                }
            } catch (err) {
                ctx.log.warn("reaction failed, falling back to the picker", err);
            }
            // Fall back to Yapper's own picker: open it, then click the matching emoji.
            const picker = row.querySelector('.msg-actions button[aria-label="Add reaction"]');
            if (!(picker instanceof HTMLElement)) return false;
            picker.click();
            setTimeout(() => {
                const match = [...document.querySelectorAll("img.emoji")].find(
                    (img) => img.getAttribute("alt") === emoji || img.getAttribute("title") === emoji,
                );
                if (match instanceof HTMLElement) match.click();
            }, 120);
            return true;
        };

        const decorate = ({ el }) => {
            if (el.querySelector(".omniyap-quick-reactions")) return;
            const bar = h("div", { class: "omniyap-quick-reactions" },
                ...quickList().map((emoji) => h("button", {
                    class: "omniyap-quick-react",
                    title: `React with ${emoji}`,
                    onclick: (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        react(el, emoji);
                    },
                }, emoji)),
            );
            el.appendChild(bar);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-quick-reactions{position:absolute;right:44px;top:-12px;display:none;gap:1px;padding:2px;border-radius:8px;
                background:#20202b;border:1px solid rgba(255,255,255,.1);box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:5}
            .msg:hover .omniyap-quick-reactions{display:flex}
            .omniyap-quick-react{width:24px;height:24px;border:0;background:transparent;font-size:15px;line-height:1;cursor:pointer;border-radius:5px}
            .omniyap-quick-react:hover{background:rgba(255,255,255,.1);transform:scale(1.15)}
            .msg{position:relative}
        `);
    },
});
