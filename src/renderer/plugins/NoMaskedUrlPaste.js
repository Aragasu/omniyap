import { definePlugin } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

export default definePlugin({
    name: "NoMaskedUrlPaste",
    description: "Pasting a link over selected text inserts the raw URL instead of masking it.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],

    start(ctx) {
        const onPaste = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const text = event.clipboardData?.getData("text") || "";
            if (!/^https?:\/\//i.test(text.trim())) return;
            const start = composer.selectionStart ?? 0;
            const end = composer.selectionEnd ?? 0;
            if (start === end) return;
            event.preventDefault();
            const next = composer.value.slice(0, start) + text.trim() + composer.value.slice(end);
            setNativeValue(composer, next);
            const caret = start + text.trim().length;
            composer.setSelectionRange?.(caret, caret);
        };

        document.addEventListener("paste", onPaste, true);
        ctx.cleanup(() => document.removeEventListener("paste", onPaste, true));
    },
});
