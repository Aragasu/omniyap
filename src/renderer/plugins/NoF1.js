import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "NoF1",
    description: "F1 no longer opens the browser's help page.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility"],
    start(ctx) {
        const onKey = (event) => {
            if (event.key !== "F1") return;
            event.preventDefault();
            event.stopPropagation();
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
