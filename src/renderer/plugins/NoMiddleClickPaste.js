import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "NoMiddleClickPaste",
    description: "Middle-clicking the composer no longer pastes the X11 clipboard.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const onMouseDown = (event) => {
            if (event.button !== 1) return;
            if (!(event.target instanceof Element) || !event.target.closest("textarea, input")) return;
            event.preventDefault();
        };
        document.addEventListener("mousedown", onMouseDown, true);
        ctx.cleanup(() => document.removeEventListener("mousedown", onMouseDown, true));
    },
});
