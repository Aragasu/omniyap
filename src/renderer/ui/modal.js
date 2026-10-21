// A small modal primitive for plugin UIs (message history, notes, bookmarks, quick switcher…).
// One modal at a time, Escape/scrim closes, focus is restored.
import dom from "../core/dom.js";

const { h } = dom;

const CSS = `
.omniyap-modal-root{position:fixed;inset:0;z-index:2147483050;display:flex;align-items:center;justify-content:center}
.omniyap-modal-root[hidden]{display:none}
.omniyap-modal-scrim{position:absolute;inset:0;background:rgba(6,6,10,.6);backdrop-filter:blur(2px)}
.omniyap-modal{position:relative;background:#1b1b26;border:1px solid rgba(255,255,255,.1);border-radius:14px;
  width:min(var(--oy-modal-width,560px),92vw);max-height:82vh;display:flex;flex-direction:column;overflow:hidden;
  box-shadow:0 20px 70px rgba(0,0,0,.55);color:#ececf1;font:14px/1.45 Inter,system-ui,sans-serif}
.omniyap-modal-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.07)}
.omniyap-modal-head h3{margin:0;font-size:15px;font-weight:650;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.omniyap-modal-head .sub{display:block;font-size:11px;color:#8b8d98;font-weight:400;margin-top:2px}
.omniyap-modal-body{padding:14px 16px;overflow:auto;scrollbar-width:thin}
.omniyap-modal-body::-webkit-scrollbar{width:9px}
.omniyap-modal-body::-webkit-scrollbar-thumb{background:#343444;border-radius:8px}
.omniyap-modal-foot{padding:10px 16px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:8px;justify-content:flex-end}
.omniyap-modal .icon-btn{background:#22222e;border:1px solid rgba(255,255,255,.1);color:#b7b9c2;border-radius:8px;width:28px;height:28px;cursor:pointer}
.omniyap-btn{padding:8px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#262633;color:#ececf1;
  font:500 12.5px Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-btn:hover{background:#30303f}
.omniyap-btn.primary{background:#8b39fd;border-color:#8b39fd;color:#fff;font-weight:650}
.omniyap-btn.primary:hover{background:#a05cff}
.omniyap-row{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.omniyap-row:last-child{border-bottom:0}
.omniyap-row .label b{display:block;font-weight:550;font-size:12.5px}
.omniyap-row .label span{display:block;color:#8b8d98;font-size:11.5px}
.omniyap-muted{color:#8b8d98;font-size:12px}
.omniyap-empty{padding:26px 10px;text-align:center;color:#8b8d98;font-size:13px}
.omniyap-pre{background:#12121a;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;
  font:11.5px/1.5 ui-monospace,monospace;color:#a9abb6;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto}
.omniyap-css{width:100%;min-height:220px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12121a;
  color:#dfe1e8;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;outline:none;box-sizing:border-box}
.omniyap-css:focus{border-color:#8b39fd}
.omniyap-search{width:230px;padding:8px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#12121a;color:#ececf1;
  font:13px Inter,system-ui,sans-serif;outline:none}
.omniyap-search:focus{border-color:#8b39fd}
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
    root.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            close();
        }
    });
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
