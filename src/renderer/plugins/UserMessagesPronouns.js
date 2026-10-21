import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    position: {
        type: OptionType.SELECT,
        description: "Where to show pronouns.",
        options: [
            { label: "After the username", value: "after" },
            { label: "Before the username", value: "before" },
        ],
        default: "after",
    },
});

export default definePlugin({
    name: "UserMessagesPronouns",
    description: "Shows people's pronouns next to their name in chat.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],

    settings,

    start(ctx) {
        const decorate = ({ el, head, message }) => {
            const author = head?.querySelector(".msg-author");
            if (!author) return;
            const id = message?.author_id || el.querySelector(".msg-gutter .avatar[aria-label]")?.getAttribute("aria-label")?.replace(/'s profile$/, "");
            if (!id) return;
            const pronouns = store.profile(id)?.pronouns;
            if (!pronouns) return;
            const existing = head.querySelector(".omniyap-pronouns");
            if (existing) {
                if (existing.textContent === pronouns) return;
                existing.remove();
            }
            const badge = h("span", { class: "omniyap-pronouns", title: "Pronouns" }, pronouns);
            if (settings.store.position === "before") head.insertBefore(badge, author);
            else head.insertBefore(badge, author.nextSibling);
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.css(`
            .omniyap-pronouns{font-size:10.5px;color:#8b8d98;background:rgba(255,255,255,.06);
                border:1px solid rgba(255,255,255,.07);border-radius:999px;padding:0 6px;margin:0 2px;white-space:nowrap}
        `);
    },
});
