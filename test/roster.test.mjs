import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
    CUSTOM_ROLES,
    OFFICIAL_ROLES,
    mergeRoleMaps,
    parseBindings,
    signedPayload,
    verifyRoster,
} from "../src/shared/roster.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));

const roster = await readJson("src/renderer/core/roster.json");
const publicKey = await readJson("src/renderer/core/roster-key.json");

const OWNER_ID = "fc529a6a-ddbd-445b-8bce-18a13acca5d0";

test("the committed roster carries a valid signature", async () => {
    assert.ok(await verifyRoster(roster, publicKey), "run `npm run roster:sign` after editing the roster");
    assert.ok(publicKey.x && publicKey.y && !publicKey.d, "only the public half of the key may be committed");
});

test("editing a role list breaks the signature", async () => {
    const forged = structuredClone(roster);
    forged.roles.developer = [...(forged.roles.developer || []), OWNER_ID];
    assert.equal(await verifyRoster(forged, publicKey), false);
});

test("replacing the owner id breaks the signature", async () => {
    const forged = structuredClone(roster);
    forged.roles.owner = ["00000000-0000-0000-0000-000000000000"];
    assert.equal(await verifyRoster(forged, publicKey), false);
});

test("the owner id is bound to the owner role", () => {
    assert.deepEqual(roster.roles.owner, [OWNER_ID]);
});

test("the signature covers a canonical payload, not the file's formatting", () => {
    const formatted = JSON.parse(JSON.stringify({ ...roster, signature: undefined }));
    assert.equal(signedPayload(formatted), signedPayload(roster));
});

test("settings bindings can grant custom roles but not official ones", () => {
    const typed = parseBindings("abc=owner\nabc=contributor\ndef=developer, tester\nghi=artist", CUSTOM_ROLES);
    assert.deepEqual(typed.get("abc"), ["contributor"]);
    assert.deepEqual([...typed.get("def")].sort(), ["tester"]);
    assert.deepEqual(typed.get("ghi"), ["artist"]);
    for (const role of OFFICIAL_ROLES) {
        assert.equal([...typed.values()].flat().includes(role), false);
    }
});

test("roster grants merge with local bindings without duplicates", () => {
    const merged = mergeRoleMaps(new Map([["abc", ["owner"]]]), new Map([["abc", ["contributor"]]]));
    assert.deepEqual(merged.get("abc"), ["owner", "contributor"]);
    assert.equal(merged.size, 1);
});

test("the badge plugin does not hardcode team user ids", async () => {
    const source = await read("src/renderer/plugins/StaffBadges.js");
    assert.equal(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(source), false);
});
