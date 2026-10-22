import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pluginsDir = path.join(root, "src", "renderer", "plugins");

async function read(file) {
    return readFile(path.join(root, file), "utf8");
}

test("every plugin module is imported by the plugin index", async () => {
    const files = (await readdir(pluginsDir)).filter((file) => file.endsWith(".js") && !file.startsWith("_") && file !== "index.js");
    const index = await read("src/renderer/plugins/index.js");
    const missing = files.filter((file) => !index.includes(`"./${file}"`));
    assert.deepEqual(missing, [], `plugins not registered in index.js: ${missing.join(", ")}`);
});

test("plugin names are unique", async () => {
    const files = (await readdir(pluginsDir)).filter((file) => file.endsWith(".js") && !file.startsWith("_") && file !== "index.js");
    const names = [];
    for (const file of files) {
        const source = await readFile(path.join(pluginsDir, file), "utf8");
        const match = source.match(/definePlugin\(\{[\s\S]{0,80}?name:\s*"([^"]+)"/);
        assert.ok(match, `${file} does not declare a plugin name`);
        names.push(match[1]);
    }
    assert.equal(new Set(names).size, names.length, "duplicate plugin names found");
});

test("every preload IPC channel has a main-process handler", async () => {
    const preload = await read("src/preload/index.js");
    const main = await read("src/main/index.js");
    const channels = new Set();
    for (const match of preload.matchAll(/ipcRenderer\.(?:invoke|sendSync)\(\s*["'`]([^"'`]+)["'`]/g)) channels.add(match[1]);
    const handled = new Set();
    for (const match of main.matchAll(/ipcMain\.(?:handle|on)\(\s*["'`]([^"'`]+)["'`]/g)) handled.add(match[1]);
    const missing = [...channels].filter((channel) => !handled.has(channel));
    assert.deepEqual(missing, [], `preload channels without a handler: ${missing.join(", ")}`);
});

test("the plugin matrix covers every Equicord plugin exactly once", async () => {
    const equicord = JSON.parse(await readFile(path.join(root, "test", "fixtures", "equicord-plugins.json"), "utf8"));
    const matrix = await read("docs/PLUGIN-MATRIX.md");
    const rows = [...matrix.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(✅ Ported|🟡 Native|🔜 Planned|🧱 Blocked|⛔ N\/A)\s*\|/gm)];
    const listed = rows.map((row) => row[1]);
    assert.equal(listed.length, equicord.length, `matrix has ${listed.length} rows, Equicord has ${equicord.length} plugins`);
    assert.equal(new Set(listed).size, listed.length, "matrix contains duplicate plugins");
    const missing = equicord.filter((name) => !listed.includes(name));
    assert.deepEqual(missing, [], `missing from matrix: ${missing.join(", ")}`);
    const extra = listed.filter((name) => !equicord.includes(name));
    assert.deepEqual(extra, [], `matrix lists plugins that are not in Equicord: ${extra.join(", ")}`);
});

test("ported plugins in the matrix exist in the renderer", async () => {
    const matrix = await read("docs/PLUGIN-MATRIX.md");
    const ported = [...matrix.matchAll(/^\|\s*`([^`]+)`\s*\|\s*✅ Ported/gm)].map((row) => row[1]);
    assert.ok(ported.length >= 50, `expected at least 50 ported plugins, found ${ported.length}`);
    const files = new Set((await readdir(pluginsDir)).map((file) => file.replace(/\.js$/, "").toLowerCase()));
    // The matrix uses Equicord names; check the plugin declarations instead of filenames.
    const declared = new Set();
    for (const file of await readdir(pluginsDir)) {
        if (!file.endsWith(".js") || file.startsWith("_")) continue;
        const source = await readFile(path.join(pluginsDir, file), "utf8");
        const match = source.match(/definePlugin\(\{[\s\S]{0,80}?name:\s*"([^"]+)"/);
        if (match) declared.add(match[1].toLowerCase());
    }
    const missing = ported.filter((name) => !declared.has(name.toLowerCase()));
    assert.deepEqual(missing, [], `matrix says ported but no plugin exists: ${missing.join(", ")}`);
    assert.ok(files.size > 0);
});

test("the built renderer contains every plugin", async () => {
    const bundle = await read("dist/renderer.js");
    const declared = [];
    for (const file of await readdir(pluginsDir)) {
        if (!file.endsWith(".js") || file.startsWith("_")) continue;
        const source = await readFile(path.join(pluginsDir, file), "utf8");
        const match = source.match(/definePlugin\(\{[\s\S]{0,80}?name:\s*"([^"]+)"/);
        if (match) declared.push(match[1]);
    }
    const missing = declared.filter((name) => !bundle.includes(JSON.stringify(name)));
    assert.deepEqual(missing, [], `missing from the built bundle: ${missing.join(", ")}`);
    assert.ok(bundle.length > 100_000, "renderer bundle looks too small");
});

test("plugins start disabled until the user enables them", async () => {
    for (const file of await readdir(pluginsDir)) {
        if (!file.endsWith(".js")) continue;
        const source = await readFile(path.join(pluginsDir, file), "utf8");
        assert.equal(/enabledByDefault/.test(source), false, `${file} declares a default-enabled plugin`);
    }
    const settings = await read("src/renderer/core/settings.js");
    assert.equal(/applyDefault/.test(settings), false, "the settings store must not enable plugins on first run");
});

test("main process keeps the security flags on", async () => {
    const main = await read("src/main/index.js");
    assert.match(main, /contextIsolation:\s*true/);
    assert.match(main, /sandbox:\s*true/);
    assert.match(main, /nodeIntegration:\s*false/);
});
