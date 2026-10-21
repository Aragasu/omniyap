import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    style: {
        type: OptionType.SELECT,
        description: "How the username is shown.",
        options: [
            { label: "Username @handle", value: "handle" },
            { label: "just the handle", value: "plain" },
        ],
        default: "handle",
    },
    onlyWhenDifferent: {
        type: OptionType.BOOLEAN,
        description: "Hide it when the username and display name are identical.",
        default: true,
    },
});

function authorIdFor(row, message) {
    if (message?.author_id) return message.author_id;
    const label = row.querySelector(".msg-gutter .avatar[aria-label]")?.getAttribute("aria-label") || "";
    return label.replace(/'s profile$/, "") || null;
}

export default definePlugin({
    name: "ShowMeYourName",
    description: "Shows the account handle next to a display name, so nicknames are never confusing.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "appearance"],
    settings,

    start(ctx) {
        const render = ({ el, head, message }) => {
            const author = head?.querySelector(".msg-author");
            if (!author || head.querySelector(".omniyap-username")) return;
            const display = author.textContent.trim();
            const id = authorIdFor(el, message);
            const profile = id ? store.profile(id) : null;
            const username = profile?.username;
            if (!username) return;
            if (settings.store.onlyWhenDifferent && username === display) return;
            const label = settings.store.style === "plain" ? ` (${username})` : ` @${username}`;
            head.insertBefore(h("span", { class: "omniyap-username", title: "Account username" }, label), author.nextSibling);
        };

        ctx.cleanup(messages.decorate(render));
        ctx.css(`
            .omniyap-username{font-size:11px;color:#8b8d98;font-weight:400;margin-left:2px}
            .msg-author{font-weight:600}
        `);
    },
});
