import { definePlugin } from "../core/api.js";
import { interceptSend } from "./_shared.js";

export default definePlugin({
    name: "SlapCommand",
    description: "The classic /slap @person IRC command, with an optional reason.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun"],

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            const match = /^\/slap\s+(\S+)(?:\s+(.+))?$/i.exec(String(text).trim());
            if (!match) return text;
            const target = match[1];
            const reason = match[2]?.trim();
            return `_*slaps ${target} around a bit with a large trout*_${reason ? ` _(${reason})_` : ""}`;
        }));
    },
});
