import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, localJson, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const history = localJson("presence-history", {});
const MAX = 12;

const settings = definePluginSettings({
    keepDays: { type: OptionType.SLIDER, description: "Keep presence history for this many days.", default: 14, min: 1, max: 90, step: 1 },
});

const label = (status) => ({ online: "Online", idle: "Idle", dnd: "Do not disturb", offline: "Offline" }[status] || status);

function prune(saved) {
    const cutoff = Date.now() - Math.max(1, Number(settings.store.keepDays) || 14) * 86_400_000;
    for (const [id, entries] of Object.entries(saved)) {
        const kept = (entries || []).filter((entry) => entry.at >= cutoff).slice(-MAX);
        if (kept.length) saved[id] = kept;
        else delete saved[id];
    }
}

function openList() {
    const saved = history.read() || {};
    const rows = Object.entries(saved)
        .map(([id, entries]) => ({ id, entries, last: entries[entries.length - 1] }))
        .sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
    const body = h("div", {}, rows.length ? rows.map((row) => h("div", { class: "omniyap-row" },
        h("div", { class: "label", style: { minWidth: 0 } },
            h("b", {}, store.displayName(row.id)),
            h("span", {}, row.entries.slice(-4).map((entry) => `${label(entry.status)} ${formatTime(entry.at)}`).join(" · ")),
        ),
        h("div", { class: "omniyap-ph-now" }, label(row.last.status)),
    )) : h("div", { class: "omniyap-empty" }, "No presence changes recorded yet."));
    openModal({ title: "Presence history", subtitle: "Recorded on this device", width: 660, body });
}

export default definePlugin({
    name: "PresenceHistory",
    description: "Keeps a local timeline of when friends go online, idle, do not disturb or offline, with a last-seen view.",
    authors: [{ name: "OmniYap" }],
    tags: ["people", "utility"],
    settings,

    start(ctx) {
        const record = (state, previous) => {
            const now = state.online || {};
            const before = previous.online || {};
            const friends = state.friends || {};
            const saved = history.read() || {};
            for (const [id, status] of Object.entries(now)) {
                if (friends[id] !== "accepted" || before[id] === status || !status) continue;
                const entries = saved[id] || [];
                if (entries[entries.length - 1]?.status === status) continue;
                entries.push({ status, at: Date.now() });
                saved[id] = entries.slice(-MAX);
            }
            prune(saved);
            history.write(saved);
        };

        ctx.on("store:change", (state, previous) => {
            if (state.online !== previous.online) record(state, previous);
        });
        ctx.cleanup(ui.registerTool({
            id: "presence-history",
            label: "Presence history",
            icon: "◷",
            description: "See when friends were last online.",
            onClick: openList,
        }));
        ctx.css(`.omniyap-ph-now{font:600 10px Inter,system-ui,sans-serif;color:#9a9ca8;white-space:nowrap}`);
    },
});
