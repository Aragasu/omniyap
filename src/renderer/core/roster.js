// Team roster: which user ids hold which official OmniYap badge. The list is signed with a key that
// is not part of this app, so editing the file — or serving a different one — cannot grant a badge
// (see docs/BADGES.md).
//
// Startup is offline-first: the bundled copy applies as soon as it verifies, then a cached copy from
// an earlier run if it is newer, then the live copy from ROSTER_URL. A document that fails the
// signature check is ignored instead of trusted, and the last good list stays in place.
import log from "./log.js";
import SNAPSHOT from "./roster.json";
import PUBLIC_KEY from "./roster-key.json";
import { normalizeRoles, roleIndex, verifyRoster } from "../../shared/roster.mjs";

// Where the live copy comes from. Any static URL works; point this at your own domain to move it.
export const ROSTER_URL = "https://raw.githubusercontent.com/Aragasu/omniyap/main/src/renderer/core/roster.json";

const CACHE_KEY = "omniyap:roster:v1";
const FETCH_TIMEOUT = 8000;

let state = { version: 0, updatedAt: "", roles: {}, source: "bundled", error: "" };
let index = new Map();
let revision = 0;
let started = false;
let resolveReady = null;
const listeners = new Set();

/** Resolves once the bundled and cached copies have been checked (network is not awaited). */
export const ready = new Promise((resolve) => {
    resolveReady = resolve;
});

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeCache(document) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(document));
    } catch {
        /* a full or blocked localStorage just means no offline copy next launch */
    }
}

function notify() {
    const snapshot = status();
    for (const listener of listeners) {
        try {
            listener(snapshot);
        } catch (err) {
            log.error("roster listener failed", err);
        }
    }
}

/** Verify, then adopt a document. Returns whether it was accepted. */
async function apply(document, source) {
    if (!(await verifyRoster(document, PUBLIC_KEY))) {
        state.error = `invalid signature (${source})`;
        log.warn(`ignored a roster from ${source}: its signature does not verify`);
        return false;
    }
    const version = Number(document.version) || 0;
    if (version < state.version) return false;

    const roles = normalizeRoles(document.roles);
    state = { version, updatedAt: String(document.updatedAt || ""), roles, source, error: "" };
    index = roleIndex(roles);
    revision += 1;
    // Only a fetched copy is worth caching: the bundled one is always available, and writing it
    // would clobber a newer roster cached from an earlier session.
    if (source === "remote") writeCache(document);
    notify();
    return true;
}

/** Fetch the live copy. Offline or blocked networks are normal and stay quiet outside dev. */
export async function refresh() {
    if (!ROSTER_URL) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        const response = await fetch(ROSTER_URL, { cache: "no-store", credentials: "omit", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await apply(await response.json(), "remote");
    } catch (err) {
        state.error = String(err?.message || err);
        log.debug("roster refresh failed", err);
        return false;
    } finally {
        clearTimeout(timer);
    }
}

/** Load the bundled and cached copies, then refresh from the network in the background. */
export function init() {
    if (started) return ready;
    started = true;
    (async () => {
        await apply(SNAPSHOT, "bundled");
        const cached = readCache();
        if (cached && (Number(cached.version) || 0) > state.version) await apply(cached, "cache");
        resolveReady?.(status());
        refresh();
    })();
    return ready;
}

/** Role keys granted to a user id by the signed roster, in roster order. */
export function rolesFor(userId) {
    if (!userId) return [];
    return index.get(String(userId)) || [];
}

/** A userId -> roles copy of the current roster, for consumers that merge it with their own lists. */
export function bindings() {
    return new Map(index);
}

/** Bumps whenever a new roster is adopted, so consumers can cache derived tables. */
export function revisionOf() {
    return revision;
}

export function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function status() {
    return {
        version: state.version,
        updatedAt: state.updatedAt,
        source: state.source,
        error: state.error,
        url: ROSTER_URL,
        roles: Object.keys(state.roles).filter((role) => state.roles[role].length),
        ids: Object.values(state.roles).reduce((total, ids) => total + ids.length, 0),
        revision,
    };
}

export default { init, ready, refresh, rolesFor, bindings, onChange, status, revisionOf, ROSTER_URL };

// The renderer starts this on import: official badges should be in place before the first message
// paints, and nothing else has to remember to call init().
init();
