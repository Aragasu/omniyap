#!/usr/bin/env node
// Signs the team badge roster. See docs/BADGES.md.
//
//   node scripts/roster.mjs keygen   create the signing keypair (once; keep the private half safe)
//   node scripts/roster.mjs sign     sign src/renderer/core/roster.json after editing it
//   node scripts/roster.mjs verify   check the committed roster against the committed public key
//
// The private key lives in .keys/roster-private.jwk, which is gitignored. Losing it means generating
// a new pair and shipping a release with the new public key; committing it means anyone can grant
// themselves a badge, so never commit it.
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { OFFICIAL_ROLES, normalizeRoles, signedPayload, toBase64Url, verifyRoster } from "../src/shared/roster.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rosterPath = path.join(root, "src", "renderer", "core", "roster.json");
const publicKeyPath = path.join(root, "src", "renderer", "core", "roster-key.json");
const privateKeyPath = path.join(root, ".keys", "roster-private.jwk");

const ECDSA_KEY = { name: "ECDSA", namedCurve: "P-256" };
const ECDSA_SIGN = { name: "ECDSA", hash: "SHA-256" };
const subtle = globalThis.crypto?.subtle;

const rel = (file) => path.relative(root, file);
const fail = (message) => {
    console.error(`roster: ${message}`);
    process.exit(1);
};

async function readJson(file) {
    return JSON.parse(await readFile(file, "utf8"));
}

async function keygen() {
    if (existsSync(privateKeyPath) && !process.argv.includes("--force")) {
        fail(`${rel(privateKeyPath)} already exists. Keep it, or pass --force to replace the keypair.`);
    }
    const pair = await subtle.generateKey(ECDSA_KEY, true, ["sign", "verify"]);
    const privateJwk = await subtle.exportKey("jwk", pair.privateKey);
    const publicJwk = await subtle.exportKey("jwk", pair.publicKey);

    await mkdir(path.dirname(privateKeyPath), { recursive: true });
    await writeFile(
        privateKeyPath,
        JSON.stringify({ kty: "EC", crv: "P-256", x: privateJwk.x, y: privateJwk.y, d: privateJwk.d, ext: true, key_ops: ["sign"] }, null, 2) + "\n",
    );
    await chmod(privateKeyPath, 0o600);
    await writeFile(
        publicKeyPath,
        JSON.stringify({ kty: "EC", crv: "P-256", x: publicJwk.x, y: publicJwk.y }, null, 2) + "\n",
    );

    console.log(`roster: wrote ${rel(privateKeyPath)} (private, gitignored) and ${rel(publicKeyPath)} (public)`);
    console.log("roster: back up the private key — it is the only thing that can update badges");
    if (existsSync(rosterPath)) console.log("roster: run `npm run roster:sign` to re-sign the roster with the new key");
}

async function sign() {
    if (!existsSync(privateKeyPath)) fail(`no signing key at ${rel(privateKeyPath)} — run \`npm run roster:keygen\` first`);
    const roster = await readJson(rosterPath);
    roster.roles = normalizeRoles(roster.roles);
    roster.version = Number(roster.version) || 1;

    const privateJwk = await readJson(privateKeyPath);
    const key = await subtle.importKey("jwk", privateJwk, ECDSA_KEY, false, ["sign"]);
    const signature = await subtle.sign(ECDSA_SIGN, key, new TextEncoder().encode(signedPayload(roster)));
    roster.signature = toBase64Url(new Uint8Array(signature));

    await writeFile(rosterPath, JSON.stringify(roster, null, 2) + "\n");
    const counts = Object.entries(roster.roles).filter(([, ids]) => ids.length).map(([role, ids]) => `${role}: ${ids.length}`).join(", ");
    console.log(`roster: signed ${rel(rosterPath)} — ${counts || "no roles bound"}`);
}

async function verify() {
    const roster = await readJson(rosterPath);
    const publicKey = await readJson(publicKeyPath);
    const valid = await verifyRoster(roster, publicKey, subtle);
    if (!valid) {
        fail(`${rel(rosterPath)} does not verify against ${rel(publicKeyPath)} — run \`npm run roster:sign\``);
    }
    const ids = new Set(Object.values(roster.roles || {}).flat());
    const owners = (roster.roles?.owner || []).length;
    console.log(`roster: valid signature — version ${roster.version}, ${ids.size} id(s), ${owners} owner(s), updated ${roster.updatedAt}`);
    for (const role of OFFICIAL_ROLES) {
        if (!Array.isArray(roster.roles?.[role])) console.warn(`roster: note — no "${role}" list in the roster`);
    }
}

const command = process.argv[2];
if (!subtle) fail("this Node build has no WebCrypto — use Node 20 or newer");
if (command === "keygen") await keygen();
else if (command === "sign") await sign();
else if (command === "verify") await verify();
else {
    console.log("usage: node scripts/roster.mjs <keygen|sign|verify>");
    process.exit(command ? 1 : 0);
}
