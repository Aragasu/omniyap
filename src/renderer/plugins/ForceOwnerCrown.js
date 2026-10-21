import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h } from "./_shared.js";

const CROWN = "omniyap-owner-crown";
const NAME_SELECTOR = ".msg-author, .chat-row .name, .members-panel .name, .voice-person .name, .pc2-head";

const settings = definePluginSettings({
    glyph: {
        type: OptionType.STRING,
        description: "Crown character or emoji.",
        default: "👑",
    },
    goldName: {
        type: OptionType.BOOLEAN,
        description: "Also tint your own name gold.",
        default: true,
    },
    inMessages: { type: OptionType.BOOLEAN, description: "Show it in chat messages.", default: true },
    inMembers: { type: OptionType.BOOLEAN, description: "Show it in member lists and profiles.", default: true },
    inVoice: { type: OptionType.BOOLEAN, description: "Show it in voice channel lists.", default: true },
});

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Shows a crown next to your own name everywhere. Purely visual: it grants nothing and nobody else sees it.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "fun"],
    settings,

    start(ctx) {
        let queued = false;

        const addCrown = (element) => {
            if (!element || element.querySelector(`:scope > .${CROWN}`)) return;
            element.append(h("span", {
                class: CROWN,
                title: "Owner (shown only to you)",
                "aria-label": "Server owner, client-side",
            }, settings.store.glyph || "👑"));
        };

        const isMine = (element) => {
            const me = store.myId();
            if (!me) return false;
            const host = element.closest?.("[data-user-id]");
            const id = host?.getAttribute("data-user-id") || element.getAttribute?.("data-user-id");
            if (id) return id === me;
            const myName = store.displayName(me);
            return !!myName && element.textContent?.trim() === myName;
        };

        const decorate = ({ el, message }) => {
            if (!settings.store.inMessages) return;
            if (!message || message.author_id !== store.myId()) return;
            const author = el.querySelector(":scope > .msg-body > .msg-head > .msg-author");
            if (author) addCrown(author);
        };

        const sweep = () => {
            queued = false;
            if (!store.myId()) return;
            const roots = [];
            if (settings.store.inMembers) {
                document.querySelectorAll(".members-panel, .profile-card, .pc2-head, [role=dialog]").forEach((node) => roots.push(node));
            }
            if (settings.store.inVoice) document.querySelectorAll(".voice-person, .voice-list").forEach((node) => roots.push(node));
            const seen = new Set();
            for (const root of roots) {
                if (seen.has(root)) continue;
                seen.add(root);
                const candidates = root.matches?.(NAME_SELECTOR) ? [root] : [];
                root.querySelectorAll(NAME_SELECTOR).forEach((node) => candidates.push(node));
                for (const element of candidates) {
                    if (element.querySelector(`:scope > .${CROWN}`)) continue;
                    if (isMine(element)) addCrown(element);
                }
            }
        };
        const queueSweep = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(sweep);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.onMutate(queueSweep);
        ctx.interval(sweep, 15000);
        ctx.on("store:change", (state, previous) => {
            if ((state.userId || null) !== (previous.userId || null)) {
                document.querySelectorAll(`.${CROWN}`).forEach((node) => node.remove());
                queueSweep();
            }
        });
        ctx.cleanup(settings.onChange(() => {
            document.querySelectorAll(`.${CROWN}`).forEach((node) => node.remove());
            messages.refresh();
            queueSweep();
        }));

        ctx.css(`
            .${CROWN}{margin-left:4px;font-size:.95em;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}
            html[data-omniyap-crown-gold] .msg-author:has(> .${CROWN}){color:#f5b301!important;font-weight:700}
        `);

        const syncGold = () => {
            document.documentElement.toggleAttribute("data-omniyap-crown-gold", !!settings.store.goldName);
        };
        syncGold();
        ctx.cleanup(settings.onChange(syncGold));
        ctx.cleanup(() => {
            document.documentElement.removeAttribute("data-omniyap-crown-gold");
            document.querySelectorAll(`.${CROWN}`).forEach((node) => node.remove());
        });

        queueSweep();
    },
});
