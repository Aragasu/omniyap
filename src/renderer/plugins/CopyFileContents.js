import { definePlugin } from "../core/api.js";
import { h, messages } from "./_shared.js";

export default definePlugin({
    name: "CopyFileContents",
    description: "Adds a copy button to code blocks in messages.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const decorate = ({ textEl }) => {
            if (!textEl || textEl.querySelector(".omniyap-copy-code")) return;
            textEl.querySelectorAll("pre").forEach((pre) => {
                const wrapper = h("div", { class: "omniyap-code-wrap" }, pre.cloneNode(true));
                const button = h("button", {
                    class: "omniyap-copy-code",
                    title: "Copy code",
                    onclick: async () => {
                        await navigator.clipboard.writeText(pre.textContent || "");
                        button.textContent = "Copied";
                        setTimeout(() => (button.textContent = "Copy"), 1200);
                    },
                }, "Copy");
                wrapper.appendChild(button);
                pre.replaceWith(wrapper);
            });
            textEl.querySelectorAll("code:not(pre code)").forEach((code) => {
                code.classList.add("omniyap-inline-code");
                code.title = "Double-click to copy";
                code.addEventListener("dblclick", () => navigator.clipboard.writeText(code.textContent || ""));
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-code-wrap{position:relative}
            .omniyap-code-wrap pre{margin:0}
            .omniyap-copy-code{position:absolute;top:6px;right:6px;padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.15);
                background:#20202b;color:#b7b9c2;font:500 10.5px Inter,system-ui,sans-serif;cursor:pointer;opacity:0;transition:opacity .12s}
            .omniyap-code-wrap:hover .omniyap-copy-code{opacity:1}
            .omniyap-copy-code:hover{color:#fff;border-color:#8b39fd}
            .omniyap-inline-code{cursor:copy}
        `);
    },
});
