import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    warnAt: {
        type: OptionType.NUMBER,
        description: "Turn the counter amber at this many characters.",
        default: 1800,
    },
    max: {
        type: OptionType.NUMBER,
        description: "Yapper's hard limit (the composer stops here).",
        default: 2000,
    },
});

export default definePlugin({
    name: "CharacterCounter",
    description: "Shows how many characters you have typed, with a warning near the limit.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let counter = null;
        let composer = null;

        const update = () => {
            if (!counter || !composer) return;
            const length = composer.value.length;
            const max = settings.store.max || 2000;
            counter.textContent = `${length} / ${max}`;
            counter.classList.toggle("warn", length >= (settings.store.warnAt || 1800));
            counter.classList.toggle("over", length >= max);
        };

        const attach = (composerEl) => {
            if (composer === composerEl) return;
            composer?.removeEventListener("input", update);
            composer = composerEl;
            const box = composer.closest(".composer-box") || composer.parentElement;
            if (!box) return;
            if (!box.querySelector(".omniyap-counter")) {
                counter = h("span", { class: "omniyap-counter", title: "Characters" }, "0 / 2000");
                box.appendChild(counter);
            } else {
                counter = box.querySelector(".omniyap-counter");
            }
            composer.addEventListener("input", update);
            update();
            ctx.cleanup(() => composer?.removeEventListener("input", update));
        };

        const off = ctx.watch(".composer textarea, .composer-box textarea", attach);
        const found = getComposer();
        if (found) attach(found);

        ctx.css(`
            .composer-box{position:relative}
            .omniyap-counter{position:absolute;right:10px;top:-18px;font:500 10px Inter,system-ui,sans-serif;
                color:#7c7f8a;pointer-events:none;letter-spacing:.02em;background:#15151f;padding:0 4px;border-radius:4px}
            .omniyap-counter.warn{color:#ffb454}
            .omniyap-counter.over{color:#ff6b6b;font-weight:700}
        `);

        ctx.cleanup(off);
    },
});
