import { definePlugin, messages } from "../core/api.js";
import { h } from "./_shared.js";

const STAMP = /(?<![\d.])(\d{10}|\d{13})(?![\d.])/g;
const MIN = Date.UTC(2001, 0, 1);
const MAX = Date.UTC(2100, 0, 1);

function toDate(value) {
    const raw = Number(value);
    const ms = String(value).length === 10 ? raw * 1000 : raw;
    if (ms < MIN || ms > MAX) return null;
    return new Date(ms);
}

export default definePlugin({
    name: "UnixTimestamps",
    description: "Turns 10- and 13-digit Unix timestamps in messages into a readable local date you can copy.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const decorate = ({ el, textEl }) => {
            if (!textEl || el.querySelector(".omniyap-unix-chip")) return;
            const text = textEl.textContent || "";
            const match = STAMP.exec(text);
            STAMP.lastIndex = 0;
            if (!match) return;
            const date = toDate(match[1]);
            if (!date) return;
            const label = date.toLocaleString();
            const chip = h("button", {
                type: "button",
                class: "omniyap-unix-chip",
                title: `${label} · click to copy`,
                onclick: (event) => {
                    event.stopPropagation();
                    navigator.clipboard.writeText(label).then(() => ctx.toast("Date copied", { type: "success", duration: 1300 }));
                },
            }, label);
            textEl.appendChild(chip);
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-unix-chip").forEach((node) => node.remove()));
        ctx.css(`
            .omniyap-unix-chip{margin-left:6px;border:1px solid rgba(139,57,253,.35);border-radius:5px;
                background:rgba(139,57,253,.12);color:#cfb8ff;font:600 10px Inter,system-ui,sans-serif;
                padding:1px 6px;cursor:pointer;vertical-align:middle;line-height:1.5}
            .omniyap-unix-chip:hover{background:rgba(139,57,253,.24)}
        `);
    },
});
