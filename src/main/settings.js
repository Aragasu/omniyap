'use strict';
// Persistent settings for the app and the renderer. One JSON file, atomic writes, deep defaults.
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const DEFAULTS = {
    window: { width: 1280, height: 840, x: null, y: null, maximized: false },
    plugins: {},
    omniyap: {
        quickCss: '',
        enabledThemes: [],
        themeLinks: [],
        zoom: 100,
        startMinimized: false,
        tray: true,
        minimizeToTray: true,
        blockYouTubeAds: false,
        nativeContextMenu: true,
        spellcheck: true,
    },
};

function dataDir() {
    return app.getPath('userData');
}

function settingsFile() {
    return path.join(dataDir(), 'settings.json');
}

function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function merge(base, patch) {
    if (!isObj(base) || !isObj(patch)) return patch === undefined ? base : patch;
    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
    }
    return out;
}

function setPath(obj, dotted, value) {
    const keys = String(dotted).split('.').filter(Boolean);
    if (!keys.length) return;
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!isObj(cur[keys[i]])) cur[keys[i]] = {};
        cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
}

class Settings {
    constructor() {
        this.data = structuredClone(DEFAULTS);
        this.listeners = new Set();
        this.writeTimer = null;
        this.load();
    }

    load() {
        try {
            const raw = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
            this.data = merge(structuredClone(DEFAULTS), raw);
        } catch (err) {
            if (err && err.code !== 'ENOENT') console.error('[omniyap] could not read settings:', err.message);
        }
        return this.data;
    }

    get(path, fallback) {
        let cur = this.data;
        for (const key of String(path).split('.')) {
            if (cur == null) return fallback;
            cur = cur[key];
        }
        return cur === undefined ? fallback : cur;
    }

    set(path, value) {
        if (/(^|\.)(__proto__|constructor|prototype)(\.|$)/.test(String(path))) return this.data;
        setPath(this.data, path, value);
        this.save();
        this.emit(path, value);
        return this.data;
    }

    patch(partial) {
        if (!isObj(partial)) return this.data;
        this.data = merge(this.data, partial);
        this.save();
        this.emit('*', this.data);
        return this.data;
    }

    save() {
        clearTimeout(this.writeTimer);
        this.writeTimer = setTimeout(() => this.flush(), 120);
    }

    flush() {
        clearTimeout(this.writeTimer);
        this.writeTimer = null;
        try {
            fs.mkdirSync(dataDir(), { recursive: true });
            const tmp = settingsFile() + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
            fs.renameSync(tmp, settingsFile());
        } catch (err) {
            console.error('[omniyap] could not write settings:', err.message);
        }
    }

    on(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    emit(path, value) {
        for (const fn of this.listeners) {
            try {
                fn(path, value);
            } catch (err) {
                console.error('[omniyap] settings listener failed:', err);
            }
        }
    }
}

module.exports = { Settings, DEFAULTS, dataDir, settingsFile };
