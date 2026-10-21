import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "NoMosaic",
    description: "Shows multiple image attachments one under another instead of a mosaic.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "media"],
    start(ctx) {
        ctx.css(`
            .msg-attachments, .attachments, .mosaic, [class*="mosaic"], [class*="media-grid"] {
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
                grid-template-columns: none !important;
            }
            .msg-attachments > *, .attachments > *, .mosaic > *, [class*="media-grid"] > * {
                width: auto !important;
                max-width: min(520px, 100%) !important;
                max-height: 420px !important;
            }
            .msg-image { max-width: min(520px, 100%) !important; }
        `);
    },
});
