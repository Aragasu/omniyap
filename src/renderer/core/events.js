// A tiny event bus. Core modules and plugins use it instead of reaching into each other.
import OmniYap from "./state.js";
import log from "./log.js";

class Emitter {
    constructor() {
        this.map = new Map();
    }

    on(name, fn) {
        let set = this.map.get(name);
        if (!set) this.map.set(name, (set = new Set()));
        set.add(fn);
        return () => this.off(name, fn);
    }

    once(name, fn) {
        const off = this.on(name, (...args) => {
            off();
            fn(...args);
        });
        return off;
    }

    off(name, fn) {
        const set = this.map.get(name);
        if (set) set.delete(fn);
    }

    has(name) {
        const set = this.map.get(name);
        return !!set && set.size > 0;
    }

    emit(name, ...args) {
        const set = this.map.get(name);
        if (!set) return;
        for (const fn of [...set]) {
            try {
                fn(...args);
            } catch (err) {
                log.error(`listener for "${name}" failed`, err);
            }
        }
    }
}

/** Resolve a promise when an event fires (or immediately if `check()` already passes). */
export function waitForEvent(name, check) {
    return new Promise((resolve) => {
        if (check) {
            const value = check();
            if (value) return resolve(value);
        }
        const off = OmniYap.events.on(name, (value) => {
            off();
            resolve(value);
        });
    });
}

OmniYap.Emitter = Emitter;
OmniYap.events = new Emitter();
OmniYap.domReady = new Promise((resolve) => {
    if (document.readyState !== "loading") resolve();
    else document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
});

export { Emitter };
export default OmniYap.events;
