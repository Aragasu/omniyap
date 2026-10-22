import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "HideServerBanner",
    description: "Removes the large banner above the channel list and gives the space back to channels.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "servers"],

    start(ctx) {
        ctx.css(`
            .server-banner{display:none!important}
            .sidebar-head.server-head.with-banner{min-height:44px!important;padding-top:6px!important;
                background:transparent!important;align-items:center!important}
            .sidebar-head.server-head .title{font-size:14px}
        `);
    },
});
