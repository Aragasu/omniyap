import { definePlugin, store } from "../core/api.js";
import { h, localJson, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const data = localJson("name-history", {});

function snapshot(profile) {
    return {
        display: profile?.display_name || profile?.displayName || profile?.username || "",
        username: profile?.username || "",
    };
}

function openList() {
    const saved = data.read() || {};
    const rows = [];
    for (const [id, entry] of Object.entries(saved)) {
        for (const change of (entry.changes || []).slice(-6).reverse()) {
            rows.push({ id, change });
        }
    }
    rows.sort((a, b) => b.change.at - a.change.at);
    openModal({
        title: "Name history",
        subtitle: "Old names remembered on this device",
        width: 660,
        body: rows.length ? h("div", {}, ...rows.slice(0, 200).map(({ id, change }) => h("div", { class: "omniyap-row" },
            h("div", { class: "label", style: { minWidth: 0 } },
                h("b", {}, store.displayName(id)),
                h("span", {}, `${change.from || "(no name)"} → ${change.to}`),
                h("span", {}, formatTime(change.at)),
            ),
        ))) : h("div", { class: "omniyap-empty" }, "No name changes seen yet."),
    });
}

export default definePlugin({
    name: "NameHistory",
    description: "Remembers people's previous display names and handles, so a rename never leaves you wondering who that is.",
    authors: [{ name: "OmniYap" }],
    tags: ["people", "utility"],

    start(ctx) {
        ctx.on("store:change", (state, previous) => {
            if (state.profiles === previous.profiles || !previous.profiles) return;
            const saved = data.read() || {};
            let changed = false;
            for (const [id, profile] of Object.entries(state.profiles || {})) {
                const oldProfile = previous.profiles?.[id];
                if (!oldProfile || !profile) continue;
                const before = snapshot(oldProfile);
                const after = snapshot(profile);
                if (before.display === after.display && before.username === after.username) continue;
                const entry = saved[id] || { changes: [] };
                const from = before.display || before.username;
                const to = after.display || after.username;
                if (from && to && from !== to) {
                    entry.changes.push({ from, to, at: Date.now() });
                    entry.changes = entry.changes.slice(-20);
                    saved[id] = entry;
                    changed = true;
                }
            }
            if (changed) data.write(saved);
        });

        ctx.cleanup(ui.registerTool({
            id: "name-history",
            label: "Name history",
            icon: "Aa",
            description: "See previous display names.",
            onClick: openList,
        }));
    },
});
