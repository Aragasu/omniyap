// Regenerates test/fixtures/equicord-plugins.json and equicord-audit.json.
// Run with: node scripts/audit-equicord.mjs <equicord-dir-listing.json>
// The listing file is the output of the GitHub contents API for src/plugins and
// src/equicordplugins ({ base: [...], extra: [...] }).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const listingPath = process.argv[2];
if (!listingPath) {
    console.error("usage: node scripts/audit-equicord.mjs <listing.json>");
    process.exit(1);
}

const strip = (name) => name.replace(/\.(desktop|discordDesktop|web|browser|dev|equibop)$/, "");
const listing = JSON.parse(await readFile(listingPath, "utf8"));
const names = [...new Set([...listing.base, ...listing.extra].map(strip))].sort();

const legacy = JSON.parse(await readFile(path.join(root, "test", "fixtures", "equicord-audit.json"), "utf8")).rows || [];
const audit = new Map(legacy.map((row) => [row.name, { status: row.status, note: row.note }]));

for (const name of ["consoleShortcuts", "serverInfo", "serverListIndicators", "themeAttributes", "noSystemBadge"]) {
    const row = audit.get(name);
    if (row) {
        row.status = "✅ Ported";
        row.note = "Implemented as a native OmniYap plugin.";
    }
}

const curated = {
    quoter: ["✅ Ported", "Implemented as the **Quoter** plugin."],
    declutter: ["🟡 Native", "OmniYap's **HideClutter** plugin covers the same ground."],
    scheduledMessages: ["🟡 Native", "OmniYap ships **ScheduleMessages**."],
    themeLibrary: ["🟡 Native", "OmniYap has Themes and Quick CSS built in."],
    toastNotifications: ["🟡 Native", "The desktop app already uses native notifications."],
    searchFix: ["🟡 Native", "Yapper's search already debounces and keeps focus."],
    stopAutoUnread: ["🟡 Native", "Yapper only marks a channel read when you open it."],
    messageLoggerEnhanced: ["🔜 Planned", "`MessageLogger` already keeps edits/deletes; the enhanced browser view is planned."],
    fontLoader: ["🔜 Planned", "`CustomFontFiles` imports local fonts; remote font loading is not implemented."],
    messageColors: ["🔜 Planned", "`MessageStyle` styles messages; per-message colours are planned."],
    hideMessages: ["🔜 Planned", "`WordFilter` and `HideMedia` cover parts of this; a manager is planned."],
    customTimestamps: ["🔜 Planned", "Timestamp format options are planned."],
    markdownTables: ["🔜 Planned", "Renderer hook for tables is planned."],
    timezones: ["🔜 Planned", "Needs a per-user timezone store."],
    unitConverter: ["🔜 Planned", "Composer hook is straightforward, not implemented yet."],
    writeUpperCase: ["🔜 Planned", "Composer transform; not implemented yet."],
    cursorBuddy: ["🔜 Planned", "`oneko` is a similar mouse follower."],
    snowfall: ["🔜 Planned", "Cosmetic overlay; not implemented yet."],
    partyMode: ["🔜 Planned", "Cosmetic overlay; not implemented yet."],
    signature: ["🔜 Planned", "Needs a per-user signature store."],
    cleanChannelName: ["🔜 Planned", "Channel title hook; not implemented yet."],
    collapsibleUi: ["🔜 Planned", "Layout hook; not implemented yet."],
    exportMessages: ["🔜 Planned", "`MessageLogger` stores history; a dedicated exporter is planned."],
    messagePeek: ["🔜 Planned", "Preview-on-hover for links; not implemented yet."],
    recentDMSwitcher: ["🔜 Planned", "DM switcher integration; not implemented yet."],
    statusPresets: ["🔜 Planned", "Status presets need Yapper's presence API."],
    voiceButtons: ["🔜 Planned", "Voice panel buttons; not implemented yet."],
    friendTags: ["🔜 Planned", "Local friend tags; not implemented yet."],
    profileSets: ["🔜 Planned", "Saved profile presets; not implemented yet."],
    moreUserTags: ["🔜 Planned", "Needs role data beyond what Yapper exposes."],
    pinDms: ["🔜 Planned", "Pinning DMs needs a sidebar ordering hook."],
    cleanChannelGroups: ["🔜 Planned", "Channel grouping hook; not implemented yet."],
    channelTabs: ["🔜 Planned", "Tabbed channels; not implemented yet."],
    keyboardNavigation: ["🔜 Planned", "Full keyboard navigation; not implemented yet."],
};

for (const name of names) {
    if (audit.has(name)) continue;
    const spec = curated[name];
    audit.set(
        name,
        spec
            ? { status: spec[0], note: spec[1] }
            : {
                status: "🧱 Blocked",
                note: "Depends on Discord client internals (webpack modules / Flux stores); Yapper exposes no equivalent.",
            },
    );
}

const rows = names.map((name) => ({ name, ...audit.get(name) }));
const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
}, {});

await writeFile(path.join(root, "test", "fixtures", "equicord-plugins.json"), JSON.stringify(names, null, 2) + "\n");
await writeFile(path.join(root, "test", "fixtures", "equicord-audit.json"), JSON.stringify({ rows }, null, 2) + "\n");
console.log(names.length, counts);
