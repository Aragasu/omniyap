// Shared by the renderer and the signing CLI: the canonical form of the team badge roster and the
// signature check that makes it trustworthy. Dependency-free, so the bundle only grows by these few
// functions.
//
// A roster is a small JSON document:
//
//   { "version": 1, "updatedAt": "2026-10-22", "roles": { "owner": ["<id>"], … }, "signature": "…" }
//
// The signature is ECDSA P-256 (raw r||s, base64url) over the canonical form of the first three
// fields. Only the public key ships in the app, so copying or editing the file cannot grant a
// badge: without the private key there is no valid signature to go with the edited list.

export const ROSTER_VERSION = 1;

/** Roles that only the signed roster can grant. Local bindings are ignored for these. */
export const OFFICIAL_ROLES = Object.freeze(["owner", "developer"]);

/** Roles a user may still bind locally (for their own friends, tests, or unofficial lists). */
export const CUSTOM_ROLES = Object.freeze(["contributor", "translator", "tester", "artist"]);

const ECDSA_KEY = { name: "ECDSA", namedCurve: "P-256" };
const ECDSA_SIGN = { name: "ECDSA", hash: "SHA-256" };

/**
 * JSON.stringify with sorted object keys and no whitespace, so the same document always produces
 * the same bytes for signing and verification regardless of how the file was formatted.
 */
export function canonicalJson(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

/** The exact string a roster's signature covers. */
export function signedPayload(document) {
    return canonicalJson({
        version: Number(document?.version) || 0,
        updatedAt: String(document?.updatedAt || ""),
        roles: document?.roles || {},
    });
}

/** Deduplicated, sorted id lists per role — the form the signer writes and the app consumes. */
export function normalizeRoles(roles) {
    const result = {};
    for (const [role, ids] of Object.entries(roles || {})) {
        if (!Array.isArray(ids)) continue;
        const clean = [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))].sort();
        if (clean.length) result[role] = clean;
        else result[role] = [];
    }
    return result;
}

/** A userId -> roles lookup, built once per roster so badge painting stays a Map read. */
export function roleIndex(roles) {
    const index = new Map();
    for (const [role, ids] of Object.entries(roles || {})) {
        for (const id of ids || []) {
            const list = index.get(id);
            if (list) list.push(role);
            else index.set(id, [role]);
        }
    }
    return index;
}

export function toBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text) {
    const base64 = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * True only when `document` was signed by the key behind `publicJwk` and its signature is intact.
 * Any edit to the version, date or role lists fails this check.
 */
export async function verifyRoster(document, publicJwk, subtle = globalThis.crypto?.subtle) {
    if (!document || typeof document !== "object" || typeof document.signature !== "string") return false;
    if (!publicJwk?.x || !publicJwk?.y || !subtle) return false;
    try {
        const key = await subtle.importKey(
            "jwk",
            { kty: "EC", crv: "P-256", x: publicJwk.x, y: publicJwk.y, ext: true },
            ECDSA_KEY,
            false,
            ["verify"],
        );
        const signature = fromBase64Url(document.signature);
        if (signature.length !== 64) return false;
        const data = new TextEncoder().encode(signedPayload(document));
        return await subtle.verify(ECDSA_SIGN, key, signature, data);
    } catch {
        return false;
    }
}

/**
 * Parse the "userId=role" lines from the plugin's settings box, keeping only roles from `allowed`.
 * Official roles are never assignable this way.
 */
export function parseBindings(text, allowed) {
    const allowedSet = new Set(allowed || []);
    const table = new Map();
    for (const line of String(text || "").split(/[\n;]+/)) {
        const match = line.match(/^\s*([^\s=:]+)\s*[=:]\s*(.+?)\s*$/);
        if (!match) continue;
        const roles = match[2]
            .split(/[,+]/)
            .map((role) => role.trim().toLowerCase())
            .filter((role) => allowedSet.has(role));
        if (!roles.length) continue;
        const id = match[1].trim();
        const existing = table.get(id) || [];
        table.set(id, [...new Set([...existing, ...roles])]);
    }
    return table;
}

/** Union of several userId -> roles maps, deduplicated per id. Later maps add, never remove. */
export function mergeRoleMaps(...maps) {
    const merged = new Map();
    for (const map of maps) {
        if (!map) continue;
        for (const [id, roles] of map) {
            const existing = merged.get(id) || [];
            merged.set(id, [...new Set([...existing, ...roles])]);
        }
    }
    return merged;
}
