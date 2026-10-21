import { definePlugin, messages, native } from "../core/api.js";
import { h, downloadUrl } from "./_shared.js";

export default definePlugin({
    name: "MediaActions",
    description: "Hover an image, video or audio attachment to open, download or copy its link.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],

    start(ctx) {
        const decorate = ({ body }) => {
            if (!body) return;
            body.querySelectorAll(".msg-image, .msg-body > img, .msg-body > video, .msg-body > audio").forEach((wrap) => {
                if (wrap.querySelector(".omniyap-media-actions")) return;
                const media = wrap.querySelector("img, video, audio") || wrap;
                const src = media.currentSrc || media.src;
                if (!src || !/^https?:/.test(src)) return;
                const actions = h("div", { class: "omniyap-media-actions" },
                    h("button", { title: "Open in browser", onclick: () => native.openExternal(src) }, "↗"),
                    h("button", { title: "Download", onclick: () => downloadUrl(src) }, "↓"),
                    h("button", { title: "Copy link", onclick: () => navigator.clipboard.writeText(src) }, "⧉"),
                );
                const host = wrap.classList.contains("msg-image") ? wrap : wrap;
                host.style.position = "relative";
                host.appendChild(actions);
            });
        };
        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-media-actions{position:absolute;top:6px;right:6px;display:none;gap:2px;padding:2px;border-radius:7px;
                background:rgba(20,20,28,.86);border:1px solid rgba(255,255,255,.12);z-index:4}
            .msg-image:hover .omniyap-media-actions, .msg-body > img:hover + .omniyap-media-actions,
            .msg-body > video:hover + .omniyap-media-actions, .msg-body > audio:hover + .omniyap-media-actions,
            .omniyap-media-actions:hover{display:flex}
            .omniyap-media-actions button{width:22px;height:22px;border:0;border-radius:5px;background:transparent;color:#c9cbd4;
                font-size:12px;cursor:pointer;line-height:1}
            .omniyap-media-actions button:hover{background:rgba(255,255,255,.12);color:#fff}
        `);
    },
});
