// Yapper ships a Next.js App Router frontend bundled with Turbopack. This hooks the runtime before
// it boots (the bundle is injected at document start), which gives plugins two things:
//
//   • module discovery — find Yapper's own modules by the names they export or by their source,
//   • source patches   — rewrite a module factory before it is instantiated (Vencord-style).
//
// Chunk format written by the Next.js bootstrap:
//   globalThis.TURBOPACK.push(["path", id, id, factory, id, factory, ...])
// Module context: { r: require, M: Map<id, factory>, c: Map<id, { exports }> }
import OmniYap from "./state.js";
import log from "./log.js";
import events from "./events.js";

const T = (OmniYap.turbo = {
    ctx: null,
    chunksSeen: 0,
    factoriesWrapped: 0,
    hookInstalled: false,
    runtimeAttached: false,
    lateInjection: false,
});

let resolveReady;
T.ready = new Promise((resolve) => {
    resolveReady = resolve;
});

function setCtx(ctx) {
    if (T.ctx) return;
    T.ctx = ctx;
    resolveReady(ctx);
    events.emit("turbo:ready", ctx);
    log.debug("Turbopack module context captured");
}

function idsBefore(list, index) {
    const ids = [];
    for (let i = index - 1; i >= 0; i--) {
        const value = list[i];
        if (typeof value === "number" || (typeof value === "string" && i > 0)) ids.unshift(value);
        else break;
    }
    return ids;
}

function wrapFactory(original, ids) {
    const wrapped = function (ctx, mod, exports) {
        if (!T.ctx && ctx && ctx.M instanceof Map) setCtx(ctx);
        let factory = original;
        if (OmniYap.patches.active()) {
            try {
                factory = OmniYap.patches.apply(original, ids) || original;
            } catch (err) {
                log.error("could not patch a module", ids, err);
            }
        }
        return factory.apply(this, arguments);
    };
    wrapped.__omniyap = true;
    wrapped.__original = original;
    wrapped.__ids = ids;
    T.factoriesWrapped++;
    return wrapped;
}

function wrapList(list, start) {
    for (let i = start; i < list.length; i++) {
        const item = list[i];
        if (Array.isArray(item)) wrapList(item, 0);
        else if (typeof item === "function" && !item.__omniyap) list[i] = wrapFactory(item, idsBefore(list, i));
    }
}

function wrapChunk(chunk) {
    T.chunksSeen++;
    if (Array.isArray(chunk)) {
        try {
            wrapList(chunk, 1);
        } catch (err) {
            log.error("could not wrap a Turbopack chunk", err);
        }
    }
}

function install() {
    if (T.hookInstalled) return;
    const g = globalThis;
    if (g.TURBOPACK && !Array.isArray(g.TURBOPACK) && typeof g.TURBOPACK.push === "function") {
        // Runtime already started (late injection, e.g. reloading the mod bundle in DevTools):
        // wrap its push and recover the module context from the next factory that runs.
        const realPush = g.TURBOPACK.push;
        g.TURBOPACK.push = function (...chunks) {
            chunks.forEach(wrapChunk);
            return realPush.apply(this, chunks);
        };
        T.hookInstalled = true;
        T.lateInjection = true;
        log.warn("injected after Yapper's runtime booted; module discovery is partial");
        return;
    }

    // Before the runtime: it expects a plain array, so keep one and intercept pushes.
    const pre = Array.isArray(g.TURBOPACK) ? g.TURBOPACK : [];
    pre.forEach(wrapChunk);
    const realPush = Array.prototype.push;
    Object.defineProperty(pre, "push", {
        configurable: true,
        writable: true,
        enumerable: false,
        value(...chunks) {
            chunks.forEach(wrapChunk);
            return realPush.apply(this, chunks);
        },
    });

    let current = pre;
    Object.defineProperty(g, "TURBOPACK", {
        configurable: true,
        enumerable: true,
        get: () => current,
        set(value) {
            if (value && typeof value === "object" && !Array.isArray(value) && typeof value.push === "function") {
                // Once booted the runtime replaces the array with an object exposing push.
                const push = value.push;
                T.runtimeAttached = true;
                current = {
                    push(...chunks) {
                        chunks.forEach(wrapChunk);
                        return push.apply(value, chunks);
                    },
                };
            } else {
                current = value;
            }
        },
    });
    T.hookInstalled = true;
    log.debug("Turbopack hook installed");
}

try {
    install();
} catch (err) {
    log.error("could not install the Turbopack hook", err);
}

// ---------------------------------------------------------------------------------------------
// Patching
// ---------------------------------------------------------------------------------------------

const patchList = [];

const patches = (OmniYap.patches = {
    register(pluginName, list) {
        for (const patch of list || []) {
            patchList.push({
                plugin: pluginName,
                find: patch.find,
                replacements: [].concat(patch.replacement || []),
                applied: 0,
                failed: [],
                predicate: patch.predicate,
            });
        }
    },

    unregister(pluginName) {
        for (let i = patchList.length - 1; i >= 0; i--) {
            if (patchList[i].plugin === pluginName) patchList.splice(i, 1);
        }
    },

    active: () => patchList.length > 0,

    report: () => patchList.map((p) => ({
        plugin: p.plugin,
        find: String(p.find).slice(0, 120),
        applied: p.applied,
        failed: p.failed.slice(0, 3),
    })),

    apply(factory, ids) {
        let source = null;
        let patched = null;
        for (const patch of patchList) {
            if (patch.predicate && !patch.predicate()) continue;
            if (source === null) {
                try {
                    source = String(factory);
                } catch {
                    return null;
                }
                patched = source;
            }
            if (patch.find instanceof RegExp) patch.find.lastIndex = 0;
            const hit = typeof patch.find === "string" ? source.includes(patch.find) : patch.find.test(source);
            if (patch.find instanceof RegExp) patch.find.lastIndex = 0;
            if (!hit) continue;

            let next = patched;
            let ok = true;
            for (const replacement of patch.replacements) {
                const before = next;
                try {
                    next = next.replace(replacement.match, replacement.replace);
                } catch (err) {
                    ok = false;
                    patch.failed.push(String(err?.message || err));
                    break;
                }
                if (next === before) {
                    ok = false;
                    patch.failed.push(`no match: ${String(replacement.match).slice(0, 80)}`);
                    break;
                }
            }
            if (!ok) continue;
            patched = next;
            patch.applied++;
        }
        if (patched === null || patched === source) return null;
        try {
            // eslint-disable-next-line no-eval
            const fn = (0, eval)(`(${patched})\n//# sourceURL=omniyap://patched/${String(ids?.[0] ?? "module")}`);
            if (typeof fn !== "function") throw new Error("patched module is not a function");
            fn.__omniyap = true;
            fn.__original = factory.__original || factory;
            return fn;
        } catch (err) {
            log.error("patched module failed to compile", ids, err);
            return null;
        }
    },
});

// ---------------------------------------------------------------------------------------------
// Finder
// ---------------------------------------------------------------------------------------------

const sourceCache = new Map();
const failedInstantiation = new Map();
const foundCache = new Map();

function hasKeys(value, names) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
    try {
        return names.every((name) => Object.prototype.hasOwnProperty.call(value, name));
    } catch {
        return false;
    }
}

function factorySource(id, factory) {
    let source = sourceCache.get(id);
    if (source === undefined) {
        try {
            source = String(factory.__original || factory);
        } catch {
            source = "";
        }
        sourceCache.set(id, source);
    }
    return source;
}

function moduleIds() {
    const ctx = T.ctx;
    return ctx && ctx.M instanceof Map ? [...ctx.M.keys()] : [];
}

export const finder = (OmniYap.finder = {
    /** Exports of an already-instantiated module that declares every name in `names`. */
    findLoaded(names) {
        const ctx = T.ctx;
        if (!ctx || !(ctx.c instanceof Map)) return null;
        for (const record of ctx.c.values()) {
            if (!record || record.error) continue;
            if (hasKeys(record.exports, names)) return record.exports;
        }
        return null;
    },

    /** Module ids whose factory source contains every string. */
    findIdsBySource(strings, limit = 20) {
        const out = [];
        for (const id of moduleIds()) {
            const factory = T.ctx.M.get(id);
            if (typeof factory !== "function") continue;
            const source = factorySource(id, factory);
            if (strings.every((s) => source.includes(s))) {
                out.push(id);
                if (out.length >= limit) break;
            }
        }
        return out;
    },

    getSource(id) {
        const factory = T.ctx?.M?.get(id);
        return factory ? factorySource(id, factory) : "";
    },

    require(id) {
        if (!T.ctx) throw new Error("Turbopack module context is not ready yet");
        return T.ctx.r(id);
    },

    /** Find a module by the names its exports declare (Vencord's findByProps, adapted). */
    findExports(names) {
        const key = names.join("|");
        if (foundCache.has(key)) return foundCache.get(key);
        let exports = finder.findLoaded(names);
        if (!exports && T.ctx) {
            const quoted = names.map((name) => `"${name}"`);
            for (const id of finder.findIdsBySource(quoted)) {
                const lastFailure = failedInstantiation.get(id);
                if (lastFailure && Date.now() - lastFailure < 2500) continue;
                try {
                    const candidate = T.ctx.r(id);
                    if (hasKeys(candidate, names)) {
                        exports = candidate;
                        break;
                    }
                } catch (err) {
                    failedInstantiation.set(id, Date.now());
                    log.debug("module could not be instantiated", id, err);
                }
            }
        }
        if (exports) foundCache.set(key, exports);
        return exports || null;
    },

    /** Find a module exporting a set of props, e.g. findByProps("sendMessage", "deleteMessage"). */
    findByProps(...props) {
        return finder.findExports(props);
    },

    /** Find a module by a memoized component's displayName (useful for React trees). */
    findByDisplayName(names) {
        const wanted = [].concat(names);
        const ctx = T.ctx;
        if (!ctx || !(ctx.c instanceof Map)) return null;
        for (const record of ctx.c.values()) {
            const exports = record?.exports;
            if (!exports) continue;
            const candidates = typeof exports === "function" ? [exports] : Object.values(exports);
            for (const candidate of candidates) {
                if (typeof candidate !== "function") continue;
                if (wanted.includes(candidate.displayName) || wanted.includes(candidate.name)) return exports;
            }
        }
        return null;
    },

    /** Poll until a module exists. Resolves to the exports, or null after `timeout` ms. */
    waitFor(names, { timeout = 0, interval = 250 } = {}) {
        return new Promise((resolve) => {
            const started = Date.now();
            const tick = () => {
                let exports = null;
                try {
                    exports = finder.findExports(names);
                } catch {
                    exports = null;
                }
                if (exports) return resolve(exports);
                if (timeout && Date.now() - started > timeout) return resolve(null);
                setTimeout(tick, interval);
            };
            tick();
        });
    },

    /** A cached getter that resolves the module on first use. */
    lazy(names) {
        let exports = null;
        return () => exports || (exports = finder.findExports(names));
    },

    stats() {
        const ctx = T.ctx;
        return {
            hookInstalled: T.hookInstalled,
            runtimeAttached: T.runtimeAttached,
            ctxCaptured: !!ctx,
            lateInjection: T.lateInjection,
            chunksSeen: T.chunksSeen,
            factoriesWrapped: T.factoriesWrapped,
            factories: ctx?.M instanceof Map ? ctx.M.size : 0,
            instantiated: ctx?.c instanceof Map ? ctx.c.size : 0,
            patches: patchList.length,
        };
    },
});

export { patches };
export default finder;
