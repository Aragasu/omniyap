#!/usr/bin/env node
// Generates the OmniYap app/tray icons from scratch (no external assets, no trademarked Yapper art).
// Requires ImageMagick (`convert`) at build time; the generated PNGs are committed so normal builds
// do not need it.
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const out = path.join(root, "assets");
if (!existsSync(out)) mkdirSync(out, { recursive: true });

function run(args) {
    execFileSync("convert", args, { stdio: "inherit" });
}

const base = path.join(out, "icon-1024.png");

// Background: deep indigo -> Yapper coral, 32px rounded corners.
run([
    "-size", "1024x1024",
    "gradient:#1b1b2b-#2b2340",
    "(", "-size", "1024x1024", "gradient:#ff6b4a-#ff9b6a", "-rotate", "135", ")",
    "-compose", "blend", "-define", "compose:args=22", "-composite",
    "(", "-size", "1024x1024", "xc:none", "-draw", "roundrectangle 0,0 1023,1023 220,220", ")",
    "-alpha", "set", "-compose", "DstIn", "-composite",
    "-fill", "white", "-font", "DejaVu-Sans-Bold", "-pointsize", "300",
    "-gravity", "center", "-annotate", "+0+18", "OY",
    base,
]);

// Rounded app icon sized for Electron/electron-builder.
run([base, "-resize", "512x512", path.join(out, "icon.png")]);
// Tray icon: monochrome-ish on transparency, small.
run([
    base, "-resize", "32x32", "-alpha", "on",
    path.join(out, "tray.png"),
]);
console.log("[omniyap] icons written to assets/");
