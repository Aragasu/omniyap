import { definePlugin } from "../core/api.js";
import { h, messages, insertIntoComposer } from "./_shared.js";

export default definePlugin({
    name: "QuoteSelection",
    description: "Select part of a message and a small Quote button appears; it turns just that text into a > quote in the composer.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        let button = null;

        const hide = () => {
            button?.remove();
            button = null;
        };

        const onMouseUp = (event) => {
            if (!(event.target instanceof Element) || event.target.closest("input, textarea, [contenteditable]")) return;
            const selection = window.getSelection();
            const text = selection?.toString().trim() || "";
            if (!selection || !text || text.length < 3 || text.length > 2000 || !selection.rangeCount) return hide();

            const range = selection.getRangeAt(0);
            const row = range.startContainer.parentElement?.closest?.(messages.selector);
            if (!row || !row.contains(range.endContainer)) return hide();

            const rect = range.getBoundingClientRect();
            hide();
            button = h("button", {
                type: "button",
                class: "omniyap-quote-selection",
                title: "Quote the selected text",
                onmousedown: (mouseEvent) => mouseEvent.preventDefault(),
                onclick: (clickEvent) => {
                    clickEvent.stopPropagation();
                    insertIntoComposer(text.split("\n").map((line) => `> ${line}`).join("\n") + "\n\n");
                    selection.removeAllRanges();
                    hide();
                },
            }, "“ Quote");
            button.style.left = `${Math.max(8, Math.min(window.innerWidth - 90, rect.left + rect.width / 2 - 38))}px`;
            button.style.top = `${Math.max(8, rect.top - 34)}px`;
            document.body.appendChild(button);
        };

        const onMouseDown = (event) => {
            if (button && event.target !== button) hide();
        };

        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("mousedown", onMouseDown, true);
        window.addEventListener("scroll", hide, true);
        ctx.cleanup(() => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("mousedown", onMouseDown, true);
            window.removeEventListener("scroll", hide, true);
            hide();
        });
        ctx.css(`
            .omniyap-quote-selection{position:fixed;z-index:2147483000;border-radius:7px;border:1px solid rgba(139,57,253,.55);
                background:#2a1745;color:#e7d9ff;font:600 11.5px Inter,system-ui,sans-serif;padding:5px 9px;cursor:pointer;
                box-shadow:0 6px 20px rgba(0,0,0,.45)}
            .omniyap-quote-selection:hover{background:#371d5b}
        `);
    },
});
