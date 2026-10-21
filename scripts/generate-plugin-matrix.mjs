// Rebuilds docs/PLUGIN-MATRIX.md from test/fixtures/equicord-audit.json.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { rows } = JSON.parse(await readFile(path.join(root, "test", "fixtures", "equicord-audit.json"), "utf8"));
const source = await readFile(path.join(root, "src", "renderer", "plugins", "index.js"), "utf8");

const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
}, {});
const order = ["✅ Ported", "🟡 Native", "🔜 Planned", "🧱 Blocked", "⛔ N/A"];
const summary = order.map((status) => `${counts[status] || 0} ${status.replace(/^[^ ]+ /, "").toLowerCase()}`).join(" · ");

const banner = `# Equicord → OmniYap plugin matrix

Audit of every plugin directory in [Equicord](https://github.com/Equicord/Equicord):
\`src/plugins\` (164) plus \`src/equicordplugins\` (201) — **${rows.length} plugins**, checked October 2026.

Equicord is Vencord plus a large set of extra plugins. The base \`src/plugins\` tree is shared with
Vencord, so this matrix covers both projects. ${source.match(/import "\.\//g)?.length || 0} plugins are
registered in OmniYap.

**Legend**

| | |
| --- | --- |
| ✅ **Ported** | Implemented for Yapper in \`src/renderer/plugins/\` |
| 🟡 **Native** | Yapper or OmniYap already does this without a plugin |
| 🔜 **Planned** | Yapper exposes the data/DOM needed; not implemented yet |
| 🧱 **Blocked** | Needs something Yapper does not expose (Discord internals, an API flag, a service key, …) |
| ⛔ **N/A** | Discord/RPC/VR/browser-specific; meaningless or impossible for Yapper |

**Totals:** ${summary}

> Ported means "reimplemented against OmniYap's plugin API and Yapper's DOM/store", not a copy of
> Equicord source. Equicord plugins written against Discord's webpack modules, Flux stores or
> permission model cannot run on Yapper at all; those are marked blocked rather than pretended.

## All plugins

| Equicord plugin | Status | Notes for Yapper |
| --- | --- | --- |
`;

const table = rows
    .map((row) => `| \`${row.name}\` | ${row.status} | ${String(row.note || "").replace(/\n/g, " ")} |`)
    .join("\n");

await writeFile(path.join(root, "docs", "PLUGIN-MATRIX.md"), banner + table + "\n");
console.log(`wrote ${rows.length} rows · ${summary}`);
