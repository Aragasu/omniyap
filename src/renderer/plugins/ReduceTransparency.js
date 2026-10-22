import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";

const settings = definePluginSettings({
    blur: { type: OptionType.BOOLEAN, description: "Also remove background blur from menus and overlays.", default: true },
});

export default definePlugin({
    name: "ReduceTransparency",
    description: "Makes menus, panels and overlays opaque, for better readability and less GPU work on older machines.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "performance"],
    settings,

    start(ctx) {
        ctx.css(`
            .rail,.sidebar,.side-panel,.main-head,.modal,.omniyap-modal,.menu,.popover,
            [class*="menu"],[class*="popover"],[class*="dropdown"],[role="menu"]{
                backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
                background-color:#191922!important
            }
            .modal .profile-card{background-color:#1b1b26!important}
            .messages{background-color:transparent!important}
        `);
        if (settings.store.blur) {
            ctx.css(`
                .rail,.sidebar,.side-panel,.main-head,.modal,.menu,.popover,
                [class*="menu"],[class*="popover"],[class*="dropdown"],[role="menu"]{
                    backdrop-filter:none!important;-webkit-backdrop-filter:none!important
                }
            `);
        }
    },
});
