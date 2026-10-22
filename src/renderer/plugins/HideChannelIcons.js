import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "HideChannelIcons",
    description: "Shows just channel names in the sidebar, with no hash or speaker icons, for a quieter channel list.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],

    start(ctx) {
        ctx.css(`
            .channel-row > .channel-main > .channel-glyph{display:none!important}
            .channel-row > .channel-main{padding-left:14px!important}
            .main-head .title > .channel-glyph.big{opacity:.8}
        `);
    },
});
