import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Enter makes a new line; Ctrl+Enter sends.", default: true },
    showHint: { type: OptionType.BOOLEAN, description: "Show a small hint in the composer.", default: true },
});

function send() {
    const button = document.querySelector(".composer .send-btn, .composer-box .send-btn, .composer button[aria-label='Send']");
    if (button instanceof HTMLElement) {
        button.click();
        return true;
    }
    return false;
}

export default definePlugin({
    name: "CtrlEnterToSend",
    description: "Makes Enter add a new line and Ctrl+Enter (or Cmd+Enter) send, so long messages are never sent by accident.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "accessibility"],
    settings,

    start(ctx) {
        let hint = null;

        const syncHint = () => {
            const composer = getComposer();
            if (!composer) return;
            const box = composer.closest(".composer-box") || composer.parentElement;
            if (!settings.store.enabled || !settings.store.showHint) {
                hint?.remove();
                hint = null;
                return;
            }
            if (hint && hint.isConnected) return;
            hint = document.createElement("span");
            hint.className = "omniyap-ctrl-hint";
            hint.textContent = "Ctrl+Enter sends";
            box?.appendChild(hint);
        };

        const onKey = (event) => {
            if (!settings.store.enabled) return;
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;

            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                if (!send()) composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const start = composer.selectionStart ?? composer.value.length;
            const end = composer.selectionEnd ?? start;
            const next = composer.value.slice(0, start) + "\n" + composer.value.slice(end);
            setNativeValue(composer, next);
            composer.setSelectionRange?.(start + 1, start + 1);
        };

        document.addEventListener("keydown", onKey, true);
        ctx.watch(".composer textarea", syncHint);
        ctx.onMutate(syncHint);
        ctx.cleanup(settings.onChange(syncHint));
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            hint?.remove();
        });
        ctx.css(`
            .composer-box{position:relative}
            .omniyap-ctrl-hint{position:absolute;right:10px;bottom:4px;font:500 9.5px Inter,system-ui,sans-serif;
                color:#676a76;pointer-events:none;user-select:none}
        `);
        syncHint();
    },
});
