import { definePlugin, definePluginSettings, OptionType, messages, store } from "../core/api.js";
import { stableHue } from "./_shared.js";

const settings = definePluginSettings({
    source: {
        type: OptionType.SELECT,
        description: "Where the colour comes from.",
        options: [
            { label: "Server role colour", value: "role" },
            { label: "Profile colour", value: "profile" },
            { label: "Stable per-user colour", value: "hash" },
        ],
        default: "role",
    },
    fallbackHash: { type: OptionType.BOOLEAN, description: "Use a stable colour when no role colour exists.", default: true },
    tintMessages: { type: OptionType.BOOLEAN, description: "Tint the message background faintly too.", default: false },
});

function rolesFor(userId) {
    const state = store.getState();
    if (!state) return [];
    const serverId = store.activeChannel()?.server_id;
    const roles = state.roles?.[serverId];
    const list = Array.isArray(roles) ? roles : roles && typeof roles === "object" ? Object.values(roles) : [];
    const assignments = state.memberRoles?.[serverId] || state.memberRoles?.[userId] || [];
    const ids = new Set(
        (Array.isArray(assignments) ? assignments : Object.keys(assignments || {})).map((entry) => (typeof entry === "string" ? entry : entry?.role_id || entry?.id)),
    );
    return list.filter((role) => !ids.size || ids.has(role?.id || role?.role_id));
}

function colorOf(userId) {
    if (!userId) return null;
    if (settings.store.source === "profile") {
        const profile = store.profile(userId);
        const raw = profile?.color || profile?.colour || profile?.role_color;
        if (raw) return raw;
    }
    if (settings.store.source === "role") {
        for (const role of rolesFor(userId)) {
            const raw = role?.color || role?.colour || role?.hex || role?.role_color;
            if (raw && String(raw) !== "#000000") return raw;
        }
    }
    if (settings.store.fallbackHash || settings.store.source === "hash") {
        return `hsl(${stableHue(userId)} 62% 72%)`;
    }
    return null;
}

export default definePlugin({
    name: "MessageColors",
    description: "Colours names using server role colours, profile colours or a stable per-user hue.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "chat", "customisation"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const userId = message?.author_id || message?.user_id;
            const color = colorOf(userId);
            const head = el.querySelector(".msg-head");
            const author = head?.querySelector(".msg-author");
            if (!color || !author) return;
            author.style.color = color;
            el.style.setProperty("--omniyap-author-color", color);
            el.toggleAttribute("data-omniyap-tint", !!settings.store.tintMessages);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => messages.refresh()));
        ctx.cleanup(() => {
            document.querySelectorAll(".msg-author").forEach((author) => {
                author.style.removeProperty("color");
            });
            document.querySelectorAll("[data-omniyap-tint]").forEach((row) => row.removeAttribute("data-omniyap-tint"));
        });
        ctx.css(`
            .msg[data-omniyap-tint] > .msg-body{background:color-mix(in srgb,var(--omniyap-author-color) 7%,transparent);
                border-radius:8px;padding:2px 6px;margin-left:-6px}
        `);
    },
});
