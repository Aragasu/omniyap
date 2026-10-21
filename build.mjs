// Builds the OmniYap renderer bundle that the preload injects into Yapper at document start.
//
// The renderer is a real ES module graph (unlike the file-concatenation approach some mods use):
// core modules and plugins import from each other, esbuild produces one IIFE that runs in the page's
// main world before any Yapper script.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const dev = process.argv.includes("--dev");
const watch = process.argv.includes("--watch");
const outfile = path.join(root, "dist", "renderer.js");

await mkdir(path.join(root, "dist"), { recursive: true });

/** Banner keeps the global clean while still giving plugins a familiar `OmniYap` object. */
const banner = `/* OmniYap renderer — injected by src/preload/index.js. GPL-3.0-or-later. */`;

const options = {
    entryPoints: [path.join(root, "src", "renderer", "index.js")],
    bundle: true,
    outfile,
    format: "iife",
    globalName: "__OmniYapBundle",
    platform: "browser",
    target: ["chrome120"],
    loader: { ".png": "dataurl" },
    charset: "utf8",
    banner: { js: banner },
    legalComments: "none",
    sourcemap: dev ? "inline" : false,
    minify: !dev,
    logLevel: "info",
    define: {
        __OMNIYAP_DEV__: JSON.stringify(dev),
    },
};

if (watch) {
    const ctx = await (await import("esbuild")).context(options);
    await ctx.watch();
    console.log("[omniyap] watching renderer…");
} else {
    await build(options);
    const code = await readFile(outfile, "utf8");
    const hash = createHash("sha256").update(code).digest("hex").slice(0, 16);
    await writeFile(
        path.join(root, "dist", "build.json"),
        JSON.stringify({ hash, bytes: Buffer.byteLength(code), builtAt: new Date().toISOString(), dev }, null, 2) + "\n",
    );
    console.log(`[omniyap] renderer ${(Buffer.byteLength(code) / 1024).toFixed(1)} KiB  sha256:${hash}`);
}

// Copy static assets the main process needs at runtime.
const copy = [
    ["assets/icon.png", "dist/icon.png"],
    ["assets/tray.png", "dist/tray.png"],
];
for (const [from, to] of copy) {
    const src = path.join(root, from);
    if (existsSync(src)) {
        await mkdir(path.dirname(path.join(root, to)), { recursive: true });
        await writeFile(path.join(root, to), await readFile(src));
    }
}
