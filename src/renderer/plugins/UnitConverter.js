import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, headerButton, insertIntoComposer } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const GROUPS = {
    length: { base: "m", units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 } },
    mass: { base: "g", units: { g: 1, kg: 1000, mg: 0.001, lb: 453.59237, oz: 28.349523125, st: 6350.29318 } },
    volume: { base: "L", units: { l: 1, ml: 0.001, cl: 0.01, dl: 0.1, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735296 } },
    speed: { base: "m/s", units: { "m/s": 1, "km/h": 0.277777778, mph: 0.44704, kn: 0.514444444 } },
    data: { base: "B", units: { b: 1, kb: 1000, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1048576, gib: 1073741824 } },
    time: { base: "s", units: { s: 1, min: 60, h: 3600, day: 86400, week: 604800 } },
    area: { base: "m²", units: { "m2": 1, "km2": 1e6, "ft2": 0.09290304, acre: 4046.8564224, ha: 10000 } },
};

const ALIASES = {
    meter: "m", meters: "m", metre: "m", metres: "m", kilometer: "km", kilometers: "km", kilometre: "km", miles: "mi", mile: "mi",
    yards: "yd", yard: "yd", feet: "ft", foot: "ft", inches: "in", inch: "in",
    gram: "g", grams: "g", kilogram: "kg", kilograms: "kg", pounds: "lb", pound: "lb", lbs: "lb", ounces: "oz", ounce: "oz", stone: "st",
    liter: "l", liters: "l", litre: "l", litres: "l", gallon: "gal", gallons: "gal", cups: "cup",
    byte: "b", bytes: "b", kilobyte: "kb", kilobytes: "kb", megabyte: "mb", megabytes: "mb", gigabyte: "gb", gigabytes: "gb",
    second: "s", seconds: "s", seconds_short: "s", minute: "min", minutes: "min", hour: "h", hours: "h", days: "day",
};

const TEMP = { c: "celsius", celsius: "celsius", f: "fahrenheit", fahrenheit: "fahrenheit", k: "kelvin", kelvin: "kelvin" };

const settings = definePluginSettings({
    precision: { type: OptionType.SLIDER, description: "Decimal places in results.", default: 2, min: 0, max: 6, step: 1 },
    autoOpen: { type: OptionType.BOOLEAN, description: "Ctrl+Shift+U opens the converter with the selected text.", default: true },
});

function normalize(unit) {
    const key = unit.toLowerCase().replace(/\.$/, "");
    return ALIASES[key] || key;
}

function convertTemp(value, from) {
    const celsius = from === "fahrenheit" ? (value - 32) * 5 / 9 : from === "kelvin" ? value - 273.15 : value;
    return {
        celsius,
        fahrenheit: celsius * 9 / 5 + 32,
        kelvin: celsius + 273.15,
    };
}

function convert(input) {
    const match = String(input).trim().match(/^(-?\d+(?:[.,]\d+)?)\s*([a-zA-Z°/²]+)$/);
    if (!match) return null;
    const value = Number(match[1].replace(",", "."));
    const raw = match[2].toLowerCase();
    if (TEMP[raw]) {
        const from = TEMP[raw];
        const result = convertTemp(value, from);
        return {
            label: `${value} ${from}`,
            results: Object.entries(result).map(([unit, converted]) => ({ unit, value: converted })),
        };
    }
    const unit = normalize(raw);
    for (const [group, data] of Object.entries(GROUPS)) {
        if (!(unit in data.units)) continue;
        const base = value * data.units[unit];
        return {
            label: `${value} ${unit} (${group})`,
            results: Object.entries(data.units).map(([target, factor]) => ({ unit: target, value: base / factor })),
        };
    }
    return null;
}

function format(value) {
    const places = Math.max(0, Math.min(6, Number(settings.store.precision)));
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-6)) return value.toExponential(places);
    return Number(value.toFixed(places)).toLocaleString();
}

export default definePlugin({
    name: "UnitConverter",
    description: "Converts length, mass, volume, speed, data, time, area and temperature right in the composer.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "productivity", "chat"],
    settings,

    start(ctx) {
        const open = (initial = "") => {
            const input = h("input", { class: "omniyap-search", style: { width: "100%" }, placeholder: "12 km, 70 kg, 98.6 f, 512 mb…", value: initial });
            const output = h("div", { style: { marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" } });
            const render = () => {
                const result = convert(input.value);
                if (!result) {
                    output.replaceChildren(h("div", { class: "omniyap-muted" }, "Type a number and a unit, for example 12 km or 98.6 f."));
                    return;
                }
                output.replaceChildren(...result.results.map((row) => h("div", { class: "omniyap-row", style: { padding: "6px 0" } },
                    h("div", { class: "label" }, h("b", {}, `${format(row.value)} ${row.unit}`), h("span", {}, result.label)),
                    h("button", {
                        class: "omniyap-btn",
                        onclick: () => insertIntoComposer(`${format(row.value)} ${row.unit}`),
                    }, "Insert"),
                )));
            };
            input.addEventListener("input", render);
            render();
            openModal({
                title: "Unit converter",
                subtitle: "Temperatures, length, mass, volume, speed, data and time",
                width: 520,
                body: h("div", {}, input, output),
                onMount: () => input.focus(),
                actions: [{
                    label: "Convert selection",
                    onClick: () => {
                        const selection = String(window.getSelection() || "").trim();
                        if (selection) {
                            input.value = selection;
                            render();
                        }
                    },
                }],
            });
        };

        const onKey = (event) => {
            if (!settings.store.autoOpen || !event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "u") return;
            const selection = String(window.getSelection() || "").trim();
            event.preventDefault();
            open(selection);
        };

        document.addEventListener("keydown", onKey, true);
        ctx.watch("header.main-head", () => headerButton({
            className: "omniyap-unit-btn",
            title: "Unit converter (Ctrl+Shift+U)",
            text: "↔",
            onClick: () => open(String(window.getSelection() || "").trim()),
        }));
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.querySelector(".omniyap-unit-btn")?.remove();
        });
        ctx.css(`.omniyap-unit-btn{font-size:14px;width:26px;height:26px;padding:0}`);
    },
});
