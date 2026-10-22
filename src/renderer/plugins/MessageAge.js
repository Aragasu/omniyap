import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h, messageDate } from "./_shared.js";

const settings = definePluginSettings({
    chip: { type: OptionType.BOOLEAN, description: "Show a small age chip that appears when hovering a message.", default: true },
    tooltip: { type: OptionType.BOOLEAN, description: "Put the absolute date in the row tooltip.", default: true },
});

function relative(date) {
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
    if (seconds < 604_800) return `${Math.round(seconds / 86_400)}d ago`;
    return `${Math.round(seconds / 604_800)}w ago`;
}

export default definePlugin({
    name: "MessageAge",
    description: "Shows how long ago a message was sent: a chip on hover and the full date in the row tooltip.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const date = messageDate(message);
            if (!date || Number.isNaN(date.getTime())) return;
            if (settings.store.tooltip) el.title = `${date.toLocaleString()} · ${relative(date)}`;
            if (!settings.store.chip) return;
            const existing = el.querySelector(".omniyap-age");
            const label = relative(date);
            if (existing) {
                if (existing.textContent !== label) existing.textContent = label;
                return;
            }
            const host = el.querySelector(":scope > .msg-body > .msg-head") || el.querySelector(":scope > .msg-body");
            if (!host) return;
            host.appendChild(h("span", { class: "omniyap-age", title: date.toLocaleString() }, label));
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.cleanup(settings.onChange(() => messages.refresh()));
        ctx.css(`
            .omniyap-age{font:500 9.5px ui-monospace,SFMono-Regular,monospace;color:#6f727e;margin-left:6px;
                opacity:0;transition:opacity .12s;pointer-events:none;white-space:nowrap}
            .msg:hover .omniyap-age{opacity:1}
        `);
    },
});
