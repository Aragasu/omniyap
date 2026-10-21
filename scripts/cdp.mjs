#!/usr/bin/env node
// Evaluate an expression in the running OmniYap window over CDP.
//
//   node scripts/cdp.mjs "window.OmniYap.plugins.list().length"
//   node scripts/cdp.mjs --screenshot out.png
//
// Requires the app to be running with --remote-debugging-port=9223.
import { writeFile } from "node:fs/promises";

const PORT = process.env.OMNIYAP_CDP_PORT || 9223;
const args = process.argv.slice(2);
const screenshotIndex = args.indexOf("--screenshot");
const screenshotPath = screenshotIndex >= 0 ? args[screenshotIndex + 1] : null;
const expression = screenshotIndex >= 0 ? null : args.join(" ") || "1";

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((target) => target.type === "page" && target.url.includes("yapper.website")) || targets.find((t) => t.type === "page");
if (!page) {
    console.error("No page target found");
    process.exit(1);
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
const logs = [];

function send(method, params = {}) {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        setTimeout(() => {
            if (pending.has(id)) {
                pending.delete(id);
                reject(new Error(`Timed out: ${method}`));
            }
        }, 20_000);
    });
}

socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
        const text = message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
        logs.push(`[console.${message.params.type}] ${text}`);
    }
    if (message.method === "Runtime.exceptionThrown") {
        logs.push(`[exception] ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description || ""}`);
    }
});

await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", reject);
});
await send("Runtime.enable");
await send("Page.enable");

if (screenshotPath) {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(screenshotPath, Buffer.from(shot.data, "base64"));
    console.log(`screenshot: ${screenshotPath}`);
} else {
    const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
    });
    if (result.exceptionDetails) {
        console.error("EVAL ERROR:", result.exceptionDetails.text, result.exceptionDetails.exception?.description || "");
        process.exitCode = 1;
    } else {
        console.log(JSON.stringify(result.result?.value, null, 2));
    }
}

if (logs.length) console.error("--- console ---\n" + logs.slice(-40).join("\n"));
socket.close();
