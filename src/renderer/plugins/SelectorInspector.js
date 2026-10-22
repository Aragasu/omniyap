import { definePlugin } from "../core/api.js";
import { h } from "./_shared.js";

function selectorFor(element) {
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && parts.length < 5) {
        if (node.id) {
            parts.unshift(`#${node.id}`);
            break;
        }
        let part = node.tagName.toLowerCase();
        const classes = [...node.classList].filter((name) => !name.startsWith("omniyap-") && !name.startsWith("data-")).slice(0, 2);
        if (classes.length) part += `.${classes.join(".")}`;
        const parent = node.parentElement;
        if (parent) {
            const siblings = [...parent.children].filter((child) => child.tagName === node.tagName);
            if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(part);
        node = parent;
    }
    return parts.join(" > ");
}

export default definePlugin({
    name: "SelectorInspector",
    description: "Alt+Shift+I turns on a picker that highlights the element under the mouse, shows its CSS selector and copies it on click.",
    authors: [{ name: "OmniYap" }],
    tags: ["development", "utility"],

    start(ctx) {
        let active = false;
        let box = null;
        let label = null;

        const stop = () => {
            active = false;
            box?.remove();
            label?.remove();
            box = null;
            label = null;
            document.documentElement.classList.remove("omniyap-inspect");
            ctx.toast("Inspector off", { duration: 1000 });
        };

        const start = () => {
            active = true;
            box = h("div", { class: "omniyap-inspect-box" });
            label = h("div", { class: "omniyap-inspect-label" });
            document.body.append(box, label);
            document.documentElement.classList.add("omniyap-inspect");
            ctx.toast("Click an element to copy its selector · Esc to stop", { duration: 2400 });
        };

        const onMove = (event) => {
            if (!active || !(event.target instanceof Element) || event.target === box || event.target === label) return;
            const rect = event.target.getBoundingClientRect();
            box.style.left = `${rect.left}px`;
            box.style.top = `${rect.top}px`;
            box.style.width = `${rect.width}px`;
            box.style.height = `${rect.height}px`;
            const selector = selectorFor(event.target);
            label.textContent = selector;
            label.style.left = `${Math.max(4, rect.left)}px`;
            label.style.top = `${Math.max(4, rect.top - 26)}px`;
            label.dataset.selector = selector;
        };

        const onClick = (event) => {
            if (!active) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const selector = (event.target instanceof Element ? selectorFor(event.target) : "") || label?.dataset.selector || "";
            if (selector) {
                navigator.clipboard.writeText(selector).then(
                    () => ctx.toast(`Copied ${selector}`, { type: "success", duration: 2200 }),
                    () => ctx.toast(selector, { duration: 3000 }),
                );
            }
        };

        const onKey = (event) => {
            if (event.altKey && event.shiftKey && event.key.toLowerCase() === "i") {
                event.preventDefault();
                event.stopPropagation();
                active ? stop() : start();
            } else if (event.key === "Escape" && active) {
                stop();
            }
        };

        document.addEventListener("mousemove", onMove, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("mousemove", onMove, true);
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("keydown", onKey, true);
            stop();
        });
        ctx.css(`
            .omniyap-inspect-box{position:fixed;z-index:2147483200;pointer-events:none;border:2px solid #c48bff;
                background:rgba(139,57,253,.12);border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
            .omniyap-inspect-label{position:fixed;z-index:2147483201;pointer-events:none;max-width:70vw;overflow:hidden;
                text-overflow:ellipsis;white-space:nowrap;background:#241436;color:#e9dcff;border:1px solid #8b39fd;
                border-radius:5px;padding:2px 6px;font:600 10px ui-monospace,monospace}
            .omniyap-inspect *{cursor:crosshair!important}
        `);
    },
});
