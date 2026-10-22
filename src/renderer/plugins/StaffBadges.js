import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import roster from "../core/roster.js";
import { h } from "./_shared.js";
import { CUSTOM_ROLES, mergeRoleMaps, parseBindings } from "../../shared/roster.mjs";

// Official roles (owner, developer) come only from the signed roster in core/roster.json, so a fork
// that edits its own copy cannot grant itself one. The other roles can be bound locally per user.
// One id can hold several roles; they are shown in rank order, at most three per name.

const ROLES = {
    owner: { label: "Owner", glyph: "♛", color: "#ffd08a", bg: "rgba(255,196,92,.16)", border: "rgba(255,196,92,.45)", rank: 0 },
    developer: { label: "Developer", glyph: "⌘", color: "#c9a7ff", bg: "rgba(139,57,253,.18)", border: "rgba(139,57,253,.45)", rank: 1 },
    contributor: { label: "Contributor", glyph: "✚", color: "#8fe3c4", bg: "rgba(48,163,108,.16)", border: "rgba(48,163,108,.4)", rank: 2 },
    translator: { label: "Translator", glyph: "文", color: "#8ec5ff", bg: "rgba(66,133,244,.16)", border: "rgba(66,133,244,.4)", rank: 3 },
    tester: { label: "Tester", glyph: "⚗", color: "#ffc48a", bg: "rgba(255,150,80,.15)", border: "rgba(255,150,80,.4)", rank: 4 },
    artist: { label: "Artist", glyph: "✎", color: "#ffa8d8", bg: "rgba(255,105,180,.15)", border: "rgba(255,105,180,.4)", rank: 5 },
};

const BADGE = "omniyap-staff-badge";

const settings = definePluginSettings({
    bindings: {
        type: OptionType.STRING,
        description: "Local bindings, one per line: userId=role (contributor, translator, tester, artist). Owner and developer come from the signed roster and cannot be assigned here.",
        multiline: true,
        placeholder: "a1b2c3d4-…=contributor\ne5f6g7h8-…=tester,artist",
        default: "",
    },
    inMessages: { type: OptionType.BOOLEAN, description: "Show badges in chat messages.", default: true },
    inMembers: { type: OptionType.BOOLEAN, description: "Show badges in member lists, profiles and voice lists.", default: true },
    compact: { type: OptionType.BOOLEAN, description: "Show only the role glyph; hover for the label.", default: false },
});

let cachedKey = null;
let cachedTable = new Map();

/** The active table, rebuilt whenever the roster or the pasted bindings change. */
function currentTable() {
    const key = `${roster.revisionOf()}\u0000${String(settings.store.bindings || "")}`;
    if (key !== cachedKey) {
        cachedKey = key;
        cachedTable = staffTable();
    }
    return cachedTable;
}

/** Signed roster grants plus the custom ids pasted into settings, in rank order per id. */
function staffTable() {
    const table = mergeRoleMaps(roster.bindings(), parseBindings(settings.store.bindings, CUSTOM_ROLES));
    for (const [id, roles] of table) {
        const known = roles.filter((role) => ROLES[role]).sort((a, b) => ROLES[a].rank - ROLES[b].rank);
        if (known.length) table.set(id, known);
        else table.delete(id);
    }
    return table;
}

function badgeFor(roleKey) {
    const role = ROLES[roleKey];
    const badge = h("span", {
        class: `${BADGE} ${BADGE}-${roleKey}`,
        title: `OmniYap ${role.label.toLowerCase()}`,
        "aria-label": `OmniYap ${role.label}`,
    }, settings.store.compact ? role.glyph : `${role.glyph} ${role.label}`);
    return badge;
}

function paint(element, roles) {
    element.querySelectorAll(`:scope > .${BADGE}`).forEach((node) => node.remove());
    for (const role of roles.slice(0, 3)) element.appendChild(badgeFor(role));
}

export default definePlugin({
    name: "StaffBadges",
    description: "Shows OmniYap team badges (owner, developer, contributor, translator, tester, artist) next to team members' names. Owner and developer come from the signed roster; the other roles can be bound locally.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "utility"],
    enabledByDefault: true,
    settings,

    start(ctx) {
        let queued = false;

        const NAME_SELECTOR = ".msg-author, .members-panel .name, .members-panel .pick-row-name, .voice-person .name, .pc2-head, .profile-card .name";

        const rolesFor = (userId) => (userId ? currentTable().get(String(userId)) : null);

        // Member rows usually carry only a rendered name, so a name -> id index is built once per
        // sweep from the loaded profiles instead of scanning every profile for every row.
        const buildIndex = () => {
            const index = new Map();
            const profiles = store.getState()?.profiles || {};
            for (const id of Object.keys(profiles)) {
                for (const key of [store.displayName?.(id), profiles[id]?.username, profiles[id]?.display_name]) {
                    if (!key) continue;
                    index.set(String(key), id);
                    index.set(String(key).toLowerCase(), id);
                }
            }
            return index;
        };

        const resolveName = (text, index) => {
            const value = String(text || "").trim();
            if (!value) return null;
            const direct = index.get(value) || index.get(value.toLowerCase());
            if (direct) return direct;
            // Rows often append the badge text or a status emoji to the name; prefer the longest
            // profile name the row text starts with.
            let best = null;
            let bestLength = 0;
            for (const [key, id] of index) {
                if (key.length <= bestLength || key.length < 2) continue;
                if (!value.toLowerCase().startsWith(key.toLowerCase())) continue;
                best = id;
                bestLength = key.length;
            }
            return best;
        };

        const idFromElement = (element, index) => {
            const host = element.closest?.("[data-user-id]");
            const direct = host?.getAttribute("data-user-id") || element.getAttribute?.("data-user-id");
            if (direct) return direct;
            return resolveName(element.textContent, index);
        };

        const decorate = ({ el, message }) => {
            if (!settings.store.inMessages) return;
            const author = el.querySelector(":scope > .msg-body > .msg-head > .msg-author");
            const userId = message?.author_id || message?.user_id || message?.sender_id;
            if (!author || !userId) return;
            const roles = rolesFor(userId);
            if (!roles) {
                author.querySelectorAll(`:scope > .${BADGE}`).forEach((node) => node.remove());
                return;
            }
            const current = [...author.querySelectorAll(`:scope > .${BADGE}`)].map((node) => node.className);
            const wanted = roles.slice(0, 3).map((role) => `${BADGE} ${BADGE}-${role}`);
            if (current.length === wanted.length && current.every((value, index) => value.includes(wanted[index]))) return;
            paint(author, roles);
        };

        const sweep = () => {
            queued = false;
            if (!settings.store.inMembers || !currentTable().size) return;
            const index = buildIndex();
            const roots = document.querySelectorAll(".members-panel, .voice-list, .profile-card, .pc2-head, [role=dialog]");
            for (const root of roots) {
                const candidates = root.matches?.(NAME_SELECTOR) ? [root] : [];
                root.querySelectorAll(NAME_SELECTOR).forEach((node) => candidates.push(node));
                for (const element of candidates) {
                    const userId = idFromElement(element, index);
                    const roles = rolesFor(userId);
                    if (!roles) continue;
                    const have = element.querySelectorAll(`:scope > .${BADGE}`).length;
                    if (have === Math.min(3, roles.length)) continue;
                    paint(element, roles);
                }
            }
        };

        const queueSweep = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(sweep);
        };

        const clearAll = () => document.querySelectorAll(`.${BADGE}`).forEach((node) => node.remove());

        const restyle = () => {
            const rules = Object.entries(ROLES)
                .map(([key, role]) => `.${BADGE}-${key}{color:${role.color};background:${role.bg};border-color:${role.border}}`)
                .join("\n            ");
            ctx.css(`
            .${BADGE}{display:inline-flex;align-items:center;gap:3px;margin-left:5px;padding:0 6px;height:15px;
                border:1px solid transparent;border-radius:999px;font:600 9px Inter,system-ui,sans-serif;line-height:1;
                letter-spacing:.02em;vertical-align:middle;white-space:nowrap;user-select:none;position:relative;top:-1px}
            .${BADGE} svg{width:9px;height:9px}
            ${rules}
            `);
        };

        restyle();
        ctx.cleanup(settings.onChange(() => {
            clearAll();
            restyle();
            messages.refresh();
            queueSweep();
        }));
        ctx.cleanup(roster.onChange(() => {
            clearAll();
            messages.refresh();
            queueSweep();
        }));
        roster.ready.then(() => {
            messages.refresh();
            queueSweep();
        });
        ctx.cleanup(messages.decorate(decorate));
        ctx.onMutate(queueSweep);
        ctx.interval(queueSweep, 15_000);
        ctx.cleanup(() => clearAll());

        queueSweep();
    },
});
