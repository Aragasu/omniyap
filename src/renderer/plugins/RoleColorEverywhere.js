import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { stableHue } from "./_shared.js";

const settings = definePluginSettings({
    members: { type: OptionType.BOOLEAN, description: "Colour names in the member list.", default: true },
    mentions: { type: OptionType.BOOLEAN, description: "Colour @mentions in messages.", default: true },
    typing: { type: OptionType.BOOLEAN, description: "Colour names in the typing indicator.", default: true },
    fallback: { type: OptionType.BOOLEAN, description: "Give users without a role a stable colour.", default: false },
});

function roleColor(userId) {
    const state = store.getState();
    if (!state || !userId) return null;
    const serverId = store.activeChannel()?.server_id;
    const roles = state.roles?.[serverId];
    const list = Array.isArray(roles) ? roles : roles && typeof roles === "object" ? Object.values(roles) : [];
    const assignments = state.memberRoles?.[serverId]?.[userId] || state.memberRoles?.[userId] || [];
    const ids = new Set((Array.isArray(assignments) ? assignments : Object.keys(assignments || {})).map((entry) => (typeof entry === "string" ? entry : entry?.role_id || entry?.id)));
    for (const role of list) {
        if (ids.size && !ids.has(role?.id || role?.role_id)) continue;
        const color = role?.color || role?.colour || role?.hex;
        if (color && String(color) !== "#000000") return color;
    }
    const profile = store.profile(userId);
    if (profile?.color || profile?.colour) return profile.color || profile.colour;
    return settings.store.fallback ? `hsl(${stableHue(userId)} 62% 72%)` : null;
}

function applyColor(element, color, painted) {
    if (!element || !color) return;
    if (element.style.color === color) return;
    if (!painted.has(element)) painted.set(element, element.style.color);
    element.style.color = color;
}

export default definePlugin({
    name: "RoleColorEverywhere",
    description: "Carries server role colours into the member list, mentions and the typing indicator.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat", "customisation"],
    settings,

    start(ctx) {
        const painted = new Map();

        // Name -> id lookups used to be a linear scan per row, which is O(rows × profiles) every
        // pass. The maps are built once and the role colour is cached per user.
        const paint = () => {
            const state = store.getState();
            if (!state?.profiles) return;
            const ids = Object.keys(state.profiles);
            if (!ids.length) return;
            const byName = new Map();
            const byUsername = new Map();
            for (const id of ids) {
                const name = store.displayName(id);
                if (name) byName.set(name, id);
                const username = store.profile(id)?.username?.toLowerCase();
                if (username) byUsername.set(username, id);
            }
            const colors = new Map();
            const colorFor = (id) => {
                if (!id) return null;
                if (!colors.has(id)) colors.set(id, roleColor(id));
                return colors.get(id);
            };
            if (settings.store.members) {
                document.querySelectorAll(".members-panel .pick-row, .members-panel [class*='member']").forEach((row) => {
                    const nameEl = row.querySelector(".pick-row-name, .name, [class*='name']");
                    const name = nameEl?.textContent?.trim();
                    if (!name) return;
                    applyColor(nameEl, colorFor(byName.get(name)), painted);
                });
            }
            if (settings.store.mentions) {
                document.querySelectorAll(".msg-text .mention, .msg-text [class*='mention']").forEach((element) => {
                    const username = element.textContent.trim().replace(/^@/, "").toLowerCase();
                    applyColor(element, colorFor(byUsername.get(username)), painted);
                });
            }
            if (settings.store.typing) {
                document.querySelectorAll(".typing, .typing-indicator, [class*='typing']").forEach((element) => {
                    const text = element.textContent || "";
                    for (const [name, id] of byName) {
                        if (text.includes(name)) {
                            applyColor(element, colorFor(id), painted);
                            break;
                        }
                    }
                });
            }
        };

        ctx.onMutate(paint);
        ctx.on("store:change", paint);
        ctx.cleanup(settings.onChange(paint));
        ctx.interval(paint, 2000);
        ctx.cleanup(() => {
            for (const [element, color] of painted) element.style.color = color;
            painted.clear();
        });
        paint();
    },
});
