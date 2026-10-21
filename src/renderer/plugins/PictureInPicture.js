import { definePlugin, messages } from "../core/api.js";
import { h } from "./_shared.js";

export default definePlugin({
    name: "PictureInPicture",
    description: "Pop any video in chat out into a floating picture-in-picture window.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],

    start(ctx) {
        const decorate = ({ el }) => {
            if (el.querySelector(".omniyap-pip")) return;
            const videos = el.querySelectorAll("video");
            if (!videos.length) return;
            videos.forEach((video) => {
                const wrap = video.parentElement;
                if (!wrap || wrap.querySelector(".omniyap-pip")) return;
                wrap.style.position = "relative";
                wrap.appendChild(h("button", {
                    class: "omniyap-pip",
                    title: "Picture in picture",
                    onclick: async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        try {
                            if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
                            else await video.requestPictureInPicture();
                        } catch (err) {
                            ctx.toast("Picture-in-picture is not available for this video", { type: "error" });
                        }
                    },
                }, "▣"));
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-pip{position:absolute;top:6px;right:6px;z-index:4;width:24px;height:24px;border-radius:6px;
                border:1px solid rgba(255,255,255,.14);background:rgba(20,20,28,.8);color:#d6d7de;cursor:pointer;
                font-size:11px;line-height:1;opacity:0;transition:opacity .12s}
            video:hover + .omniyap-pip, .omniyap-pip:hover, .msg:hover .omniyap-pip{opacity:1}
            .omniyap-pip:hover{border-color:#8b39fd;color:#fff}
        `);
    },
});
