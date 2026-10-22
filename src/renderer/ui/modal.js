// A small modal primitive for plugin UIs (message history, notes, bookmarks, quick switcher…).
// One modal at a time, Escape/scrim closes, focus is restored.
import dom from "../core/dom.js";

const { h } = dom;

const CSS = `
/* Sits above the OmniYap settings panel (2147483100): tools and plugin dialogs open from there. */
.omniyap-modal-root{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center}
.omniyap-modal-root[hidden]{display:none}
.omniyap-modal-root :focus-visible{outline:2px solid #b57bff;outline-offset:2px}
.omniyap-modal-scrim{position:absolute;inset:0;background:rgba(6,6,10,.6);backdrop-filter:blur(2px)}
.omniyap-modal{position:relative;background:#1b1b26;border:1px solid rgba(255,255,255,.1);border-radius:14px;
  width:min(var(--oy-modal-width,560px),92vw);max-height:82vh;max-height:82dvh;display:flex;flex-direction:column;overflow:hidden;
  box-shadow:0 20px 70px rgba(0,0,0,.55);color:#ececf1;font:14px/1.45 Inter,system-ui,sans-serif;box-sizing:border-box;
  color-scheme:dark}
.omniyap-modal *{box-sizing:border-box}
.omniyap-modal input,.omniyap-modal select,.omniyap-modal textarea{max-width:100%}
.omniyap-modal-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.07)}
.omniyap-modal-head h3{margin:0;font-size:15px;font-weight:650;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.omniyap-modal-head .sub{display:block;font-size:11px;color:#8b8d98;font-weight:400;margin-top:2px}
.omniyap-modal-body{padding:14px 16px;overflow:auto;scrollbar-width:thin;scrollbar-color:#3a3a4d transparent}
.omniyap-modal-body::-webkit-scrollbar{width:10px}
.omniyap-modal-body::-webkit-scrollbar-track{background:transparent}
.omniyap-modal-body::-webkit-scrollbar-thumb{background:#3a3a4d;border:2px solid transparent;background-clip:content-box;border-radius:8px}
.omniyap-modal-foot{padding:10px 16px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:8px;justify-content:flex-end}
.omniyap-modal .icon-btn{background:#22222e;border:1px solid rgba(255,255,255,.1);color:#b7b9c2;border-radius:8px;width:28px;height:28px;cursor:pointer}
/* Generic component rules are scoped to the dialog: this sheet and the settings sheet are both
   global, and unscoped copies of the same class names were overriding each other by load order. */
.omniyap-modal-root .omniyap-btn{padding:8px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#262633;color:#ececf1;
  font:500 12.5px Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-modal-root .omniyap-btn:hover{background:#30303f}
.omniyap-modal-root .omniyap-btn.primary{background:#8b39fd;border-color:#8b39fd;color:#fff;font-weight:650}
.omniyap-modal-root .omniyap-btn.primary:hover{background:#a05cff}
.omniyap-modal-root .omniyap-btn.small{height:28px;padding:0 12px;font:500 12px Inter,system-ui,sans-serif}
.omniyap-modal-root .omniyap-row{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 0;
  border-bottom:1px solid rgba(255,255,255,.05)}
.omniyap-modal-root .omniyap-row:last-child{border-bottom:0}
.omniyap-modal-root .omniyap-row .label{flex:1 1 180px;min-width:0;overflow-wrap:anywhere}
.omniyap-modal-root .omniyap-row .label b{display:block;font-weight:550;font-size:12.5px}
.omniyap-modal-root .omniyap-row .label span{display:block;color:#8b8d98;font-size:11.5px}
.omniyap-modal-root .omniyap-muted{color:#8b8d98;font-size:12px}
.omniyap-modal-root .omniyap-empty{display:flex;flex-direction:column;align-items:center;padding:26px 10px;
  text-align:center;color:#8b8d98;font-size:13px}
.omniyap-modal-root .omniyap-pre{background:#12121a;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;
  font:11.5px/1.5 ui-monospace,monospace;color:#a9abb6;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;
  scrollbar-width:thin;scrollbar-color:#3a3a4d transparent}
.omniyap-modal-root .omniyap-css{width:100%;min-height:220px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);
  background:#12121a;color:#dfe1e8;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;outline:none;
  box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#3a3a4d transparent}
.omniyap-modal-root .omniyap-css:focus{border-color:#8b39fd}
.omniyap-modal-root .omniyap-search{width:230px;max-width:100%;padding:7px 11px;border-radius:8px;
  border:1px solid rgba(255,255,255,.1);background:#12121a;color:#ececf1;font:13px Inter,system-ui,sans-serif;outline:none}
.omniyap-modal-root .omniyap-search:focus{border-color:#8b39fd}
.omniyap-modal-root input[type=range]{-webkit-appearance:none;appearance:none;height:24px;background:transparent;
  accent-color:#8b39fd;cursor:pointer}
.omniyap-modal-root input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:#3a3a4a}
.omniyap-modal-root input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;
  border-radius:50%;background:#b57bff;border:0}
@media (max-width: 720px){
  .omniyap-modal{width:96vw;max-height:88vh;max-height:88dvh;border-radius:12px}
  .omniyap-modal-head{padding:12px 14px}
  .omniyap-modal-body{padding:12px 14px}
  .omniyap-modal-foot{padding:10px 14px}
  .omniyap-modal-root .omniyap-row{flex-wrap:wrap}
  .omniyap-modal-root .omniyap-row .label{flex:1 1 100%}
}
`;

let root = null;
let onClose = null;

function ensure() {
    if (!document.getElementById("omniyap-modal-styles")) {
        const style = document.createElement("style");
        style.id = "omniyap-modal-styles";
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    if (root) return root;

    root = h("div", { class: "omniyap-modal-root", hidden: true },
        h("div", { class: "omniyap-modal-scrim", onmousedown: (event) => {
            if (event.target.classList.contains("omniyap-modal-scrim")) close();
        } }),
        h("div", { class: "omniyap-modal", role: "dialog", "aria-modal": "true" },
            h("div", { class: "omniyap-modal-head" },
                h("h3", {}),
                h("button", { class: "icon-btn", "aria-label": "Close", onclick: close }, "×"),
            ),
            h("div", { class: "omniyap-modal-body" }),
            h("div", { class: "omniyap-modal-foot" }),
        ),
    );
    document.body.appendChild(root);
    // Document-level so Escape works even when focus sits outside the dialog (a scrim click, or
    // the window having just regained focus). Capture phase keeps it ahead of the settings panel.
    document.addEventListener("keydown", (event) => {
        if (root.hidden || event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close();
    }, true);
    return root;
}

export function openModal({ title, subtitle, width = 560, body, actions = [], onMount }) {
    const el = ensure();
    el.querySelector(".omniyap-modal").style.setProperty("--oy-modal-width", `${width}px`);

    const heading = el.querySelector(".omniyap-modal-head h3");
    heading.replaceChildren(document.createTextNode(title || "OmniYap"));
    if (subtitle) heading.appendChild(h("span", { class: "sub" }, subtitle));

    const bodyEl = el.querySelector(".omniyap-modal-body");
    bodyEl.replaceChildren(body instanceof Node ? body : document.createTextNode(String(body ?? "")));

    const foot = el.querySelector(".omniyap-modal-foot");
    foot.replaceChildren(...actions.map((action) =>
        h("button", {
            class: `omniyap-btn${action.primary ? " primary" : ""}`,
            onclick: () => action.onClick?.({ close }),
        }, action.label),
    ));

    el.hidden = false;
    bodyEl.scrollTop = 0;
    onMount?.(bodyEl, { close });
    const focusable = bodyEl.querySelector("input, textarea, button");
    focusable?.focus?.();
    return { body: bodyEl, close };
}

export function close() {
    if (!root) return;
    root.hidden = true;
    onClose?.();
    onClose = null;
}

export function setCloseHandler(fn) {
    onClose = fn;
}

dom.modal = { open: openModal, close };
export default dom.modal;
