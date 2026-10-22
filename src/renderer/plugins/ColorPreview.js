import { definePlugin, messages } from "../core/api.js";
import { h } from "./_shared.js";

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i;

function luminance(hex) {
    let value = hex.slice(1);
    if (value.length === 3) value = [...value].map((char) => char + char).join("");
    const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
    const convert = (channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

export default definePlugin({
    name: "ColorPreview",
    description: "Shows a small swatch next to hex colours in messages, with click-to-copy and a contrast hint for text colours.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const decorate = ({ el, textEl }) => {
            if (!textEl) return;
            if (el.querySelector(".omniyap-color-chip")) return;
            if (textEl.querySelector("pre, code")) return;
            const match = HEX.exec(textEl.textContent || "");
            if (!match) return;
            const hex = match[0];
            const light = luminance(hex) > 0.5;
            const chip = h("button", {
                type: "button",
                class: "omniyap-color-chip",
                title: `${hex} · ${light ? "light" : "dark"} colour · click to copy`,
                style: { background: hex, color: light ? "#111" : "#fff" },
                onclick: (event) => {
                    event.stopPropagation();
                    navigator.clipboard.writeText(hex).then(
                        () => ctx.toast(`${hex} copied`, { type: "success", duration: 1400 }),
                        () => ctx.toast("Could not copy", { type: "error", duration: 1400 }),
                    );
                },
            }, hex.toUpperCase());
            textEl.appendChild(chip);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-color-chip").forEach((node) => node.remove()));
        ctx.css(`
            .omniyap-color-chip{margin-left:6px;border:1px solid rgba(255,255,255,.22);border-radius:5px;
                font:700 9.5px ui-monospace,monospace;padding:1px 5px;cursor:pointer;vertical-align:middle;
                box-shadow:0 1px 4px rgba(0,0,0,.35);line-height:1.5}
            .omniyap-color-chip:hover{transform:translateY(-1px)}
        `);
    },
});
