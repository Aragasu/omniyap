// Writes docs/plugins.json from the plugin sources so the website can list every plugin.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, "src", "renderer", "plugins");
const files = (await readdir(dir)).filter((file) => file.endsWith(".js") && !file.startsWith("_") && file !== "index.js");

const plugins = [];
for (const file of files) {
    const source = await readFile(path.join(dir, file), "utf8");
    const block = source.match(/definePlugin\(\{([\s\S]{0,600}?)\n\s*settings|definePlugin\(\{([\s\S]*?)\n\}\);/);
    const match = source.match(/definePlugin\(\{\s*name:\s*"([^"]+)",\s*description:\s*"([^"]*)",[\s\S]{0,400}?tags:\s*\[([^\]]*)\]/);
    if (!match) continue;
    plugins.push({
        name: match[1],
        description: match[2].replace(/\\"/g, '"'),
        tags: match[3].split(",").map((tag) => tag.trim().replace(/^"|"$/g, "")).filter(Boolean),
    });
}

plugins.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(path.join(root, "docs", "plugins.json"), JSON.stringify(plugins, null, 2) + "\n");
console.log(`${plugins.length} plugins exported`);
