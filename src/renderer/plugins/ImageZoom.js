import { definePlugin } from "../core/api.js";
import { h } from "./_shared.js";

export default definePlugin({
    name: "ImageZoom",
    description: "Click an image to open a full-screen viewer you can zoom and pan.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],

    start(ctx) {
        let overlay = null;
        let image = null;
        let scale = 1;
        let x = 0;
        let y = 0;
        let dragging = false;
        let startX = 0;
        let startY = 0;

        const apply = () => {
            if (!image) return;
            image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        };

        const close = () => {
            overlay?.remove();
            overlay = null;
            image = null;
        };

        const open = (src) => {
            close();
            scale = 1;
            x = 0;
            y = 0;
            image = h("img", { src, class: "omniyap-zoom-img", draggable: false });
            overlay = h("div", {
                class: "omniyap-zoom",
                onclick: (event) => {
                    if (event.target === overlay) close();
                },
                onwheel: (event) => {
                    event.preventDefault();
                    scale = Math.min(8, Math.max(0.2, scale * (event.deltaY < 0 ? 1.15 : 0.87)));
                    apply();
                },
                onmousedown: (event) => {
                    dragging = true;
                    startX = event.clientX - x;
                    startY = event.clientY - y;
                },
                onmousemove: (event) => {
                    if (!dragging) return;
                    x = event.clientX - startX;
                    y = event.clientY - startY;
                    apply();
                },
                onmouseup: () => (dragging = false),
                onmouseleave: () => (dragging = false),
            },
                image,
                h("div", { class: "omniyap-zoom-ui" },
                    h("button", {
                        onclick: (event) => {
                            event.stopPropagation();
                            scale = Math.max(0.2, scale / 1.25);
                            apply();
                        },
                    }, "−"),
                    h("button", {
                        onclick: (event) => {
                            event.stopPropagation();
                            scale = 1;
                            x = 0;
                            y = 0;
                            apply();
                        },
                    }, "Reset"),
                    h("button", {
                        onclick: (event) => {
                            event.stopPropagation();
                            scale = Math.min(8, scale * 1.25);
                            apply();
                        },
                    }, "+"),
                    h("button", {
                        onclick: (event) => {
                            event.stopPropagation();
                            const link = h("a", { href: src, download: "", target: "_blank", rel: "noreferrer" });
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        },
                    }, "Download"),
                    h("button", { onclick: close }, "Close"),
                ),
            );
            document.body.appendChild(overlay);
        };

        const onClick = (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || overlay) return;
            const imageEl = target.closest(".msg-image img, .msg-body img");
            if (!imageEl) return;
            if (imageEl.closest("a[href]")) return;
            event.preventDefault();
            event.stopPropagation();
            open(imageEl.currentSrc || imageEl.src);
        };

        document.addEventListener("click", onClick, true);
        const onKey = (event) => {
            if (!overlay) return;
            if (event.key === "Escape") close();
            if (event.key === "+" || event.key === "=") {
                scale = Math.min(8, scale * 1.2);
                apply();
            }
            if (event.key === "-") {
                scale = Math.max(0.2, scale / 1.2);
                apply();
            }
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("keydown", onKey, true);
            close();
        });

        ctx.css(`
            .omniyap-zoom{position:fixed;inset:0;z-index:2147483200;background:rgba(5,5,8,.92);display:flex;align-items:center;justify-content:center;cursor:grab;overflow:hidden}
            .omniyap-zoom:active{cursor:grabbing}
            .omniyap-zoom-img{max-width:92vw;max-height:88vh;transform-origin:center;transition:transform .06s linear;user-select:none;box-shadow:0 20px 80px rgba(0,0,0,.6);border-radius:6px}
            .omniyap-zoom-ui{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);display:flex;gap:8px}
            .omniyap-zoom-ui button{padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#20202b;color:#d6d7de;
                font:500 12px Inter,system-ui,sans-serif;cursor:pointer}
            .omniyap-zoom-ui button:hover{border-color:#8b39fd;color:#fff}
        `);
    },
});
