#!/usr/bin/env node
// End-to-end smoke test: launches the real Electron app against yapper.website with a clean profile
// and asserts that the mod boots, hooks Turbopack, finds Yapper's store and registers every plugin.
//
//   node scripts/smoke.mjs
//
// Exits non-zero on any failure. Uses a temporary --user-data-dir so it never touches your settings.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const electron = path.join(root, "node_modules", ".bin", "electron");
const profile = await mkdtemp(path.join(tmpdir(), "omniyap-smoke-"));

const child = spawn(electron, [".", "--omniyap-smoke", "--hidden", `--user-data-dir=${profile}`], {
    cwd: root,
    env: { ...process.env, OMNIYAP_SMOKE_DELAY: "9000" },
    stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
const timer = setTimeout(() => {
    console.error("smoke: timed out after 60s");
    console.error(output.slice(-2000));
    child.kill("SIGTERM");
    process.exitCode = 1;
}, 60_000);

child.stdout.on("data", (chunk) => {
    output += chunk;
});
child.stderr.on("data", (chunk) => {
    output += chunk;
});

const code = await new Promise((resolve) => child.on("exit", (exitCode) => resolve(exitCode)));
clearTimeout(timer);
await rm(profile, { recursive: true, force: true });

const line = output.split("\n").find((entry) => entry.includes("[smoke] "));
if (!line) {
    console.error("smoke: the app never reported a result");
    console.error(output.slice(-3000));
    process.exit(1);
}

const result = JSON.parse(line.slice(line.indexOf("[smoke] ") + "[smoke] ".length));
const failures = [];
if (!result.loaded) failures.push("renderer did not load");
if (!result.plugins || result.plugins.length < 70) failures.push(`expected 70+ plugins, got ${result.plugins?.length}`);
if (!result.finder?.ctxCaptured) failures.push("Turbopack context was not captured");
if (result.finder?.factoriesWrapped < 50) failures.push(`expected 50+ wrapped factories, got ${result.finder?.factoriesWrapped}`);
if (!result.storeReady) failures.push("Yapper store was not found");
const errored = (result.plugins || []).filter((plugin) => plugin.error);
if (errored.length) failures.push(`plugin errors: ${errored.map((plugin) => `${plugin.name}: ${plugin.error}`).join(", ")}`);

console.log(JSON.stringify({
    loaded: result.loaded,
    version: result.version,
    plugins: result.plugins?.length,
    turbopack: result.finder,
    storeReady: result.storeReady,
    childExit: code,
}, null, 2));

if (failures.length) {
    console.error("smoke: FAILED");
    for (const failure of failures) console.error(" - " + failure);
    process.exit(1);
}

console.log("smoke: OK");
