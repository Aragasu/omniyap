import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    autoDismiss: {
        type: OptionType.BOOLEAN,
        description: "Automatically dismiss the welcome/onboarding panel.",
        default: true,
    },
});

export default definePlugin({
    name: "NoOnboardingDelay",
    description: "Skips Yapper's onboarding intro so you land straight in chat.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility"],
    settings,

    start(ctx) {
        ctx.css(`
            .onboarding, [class*="onboarding"], .welcome-tour, [class*="intro-overlay"] {
                animation-duration: 0s !important;
                transition-duration: 0s !important;
            }
        `);

        if (!settings.store.autoDismiss) return;
        const dismiss = () => {
            const overlay = document.querySelector(".onboarding, [class*='onboarding']");
            if (!overlay) return;
            const skip = overlay.querySelector("button[class*='skip'], button[aria-label*='Skip'], button");
            if (skip instanceof HTMLElement) skip.click();
        };
        ctx.onMutate(dismiss);
        ctx.interval(dismiss, 2000);
    },
});
