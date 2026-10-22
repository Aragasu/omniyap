import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "FixCodeblockGap",
    description: "Removes the oversized gap Yapper leaves above and below fenced code blocks.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],

    start(ctx) {
        ctx.css(`
            .msg-text pre{margin:4px 0 2px!important}
            .msg-text pre + pre{margin-top:2px!important}
            .msg-text > pre:first-child{margin-top:0!important}
            .msg-text > pre:last-child{margin-bottom:0!important}
            .msg-text code{font-size:.92em}
            .msg-text pre code{padding:0}
        `);
    },
});
