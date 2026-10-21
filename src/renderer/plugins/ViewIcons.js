import { definePlugin, store } from "../core/api.js";
import { h, messages } from "./_shared.js";
import { openModal } from "../ui/modal.js";

export default definePlugin({
    name: "ViewIcons",
    description: "Click an avatar to view and download it at full size.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "utility"],

    start(ctx) {
        const srcFor = (el) => {
            const img = el.querySelector("img.avatar-pic, img");
            return img ? img.currentSrc || img.src : null;
        };

        const onClick = (event) => {
            const avatar = event.target instanceof Element ? event.target.closest(".avatar") : null;
            if (!avatar || !avatar.closest(".msg, .members-panel, .pick-row")) return;
            const src = srcFor(avatar);
            if (!src) return;
            event.preventDefault();
            event.stopPropagation();
            const label = avatar.getAttribute("aria-label")?.replace(/'s profile$/, "") || "Avatar";
            openModal({
                title: label,
                width: 520,
                body: h("div", { style: { display: "grid", placeItems: "center", gap: "12px" } },
                    h("img", { src, style: { maxWidth: "100%", maxHeight: "52vh", borderRadius: "14px" } }),
                ),
                actions: [
                    {
                        label: "Open original",
                        onClick: () => window.open(src, "_blank", "noopener"),
                    },
                    {
                        label: "Download",
                        primary: true,
                        onClick: () => {
                            const link = h("a", { href: src, download: "", target: "_blank", rel: "noreferrer" });
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        },
                    },
                ],
            });
        };

        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));
    },
});
