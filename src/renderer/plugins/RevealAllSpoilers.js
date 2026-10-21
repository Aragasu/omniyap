import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    automatic: {
        type: OptionType.BOOLEAN,
        description: "Reveal every spoiler as messages arrive.",
        default: true,
    },
});

export default definePlugin({
    name: "RevealAllSpoilers",
    description: "Reveal blurred spoilers in chat, without clicking each one.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const reveal = (root = document) => {
            root.querySelectorAll(".spoiler, .msg-spoiler, [class*='spoiler']").forEach((el) => {
                el.classList.add("omniyap-revealed");
                el.removeAttribute("aria-hidden");
                if (el instanceof HTMLButtonElement) el.tabIndex = -1;
            });
        };

        if (settings.store.automatic) {
            ctx.watch(".msg", () => reveal());
            ctx.onMutate(() => reveal());
            reveal();
        }

        ctx.css(`
            .omniyap-revealed{filter:none !important;background:transparent !important;color:inherit !important;cursor:text !important}
            .omniyap-revealed::before,.omniyap-revealed::after{display:none !important}
        `);
    },
});
