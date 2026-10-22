import { definePlugin, messages, store } from "../core/api.js";
import { h, addMessageAction, authorOf, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const tags = localJson("friend-tags", {});

const COLORS = ["#b57bff", "#6ede9f", "#f5a524", "#ff8d8d", "#63b3ed", "#f687b3"];

function tagOf(userId) {
    return tags.read()[userId] || null;
}

function edit(userId, name, onChange) {
    const current = tagOf(userId) || { label: "", color: COLORS[0] };
    const label = h("input", { class: "omniyap-search", style: { width: "100%" }, value: current.label, placeholder: "e.g. IRL, work, guild leader" });
    const color = h("select", { class: "omniyap-search", style: { width: "100%", marginTop: "8px" } },
        ...COLORS.map((value) => h("option", { value, selected: value === current.color }, value)),
    );
    openModal({
        title: name || "Friend tag",
        subtitle: "Stored only on this device",
        width: 420,
        body: h("div", {}, label, color),
        actions: [
            {
                label: "Remove",
                onClick: ({ close }) => {
                    const all = tags.read();
                    delete all[userId];
                    tags.write(all);
                    onChange?.();
                    close();
                },
            },
            {
                label: "Save",
                primary: true,
                onClick: ({ close }) => {
                    const all = tags.read();
                    if (label.value.trim()) all[userId] = { label: label.value.trim().slice(0, 24), color: color.value };
                    else delete all[userId];
                    tags.write(all);
                    onChange?.();
                    close();
                },
            },
        ],
    });
}

function badge(tag) {
    return h("span", { class: "omniyap-friend-tag", style: { color: tag.color, borderColor: `${tag.color}55`, background: `${tag.color}18` } }, tag.label);
}

export default definePlugin({
    name: "FriendTags",
    description: "Gives friends a short coloured tag that appears beside their name in chat.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "social"],
    settings: undefined,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const userId = message?.author_id || message?.user_id;
            el.querySelectorAll(".omniyap-friend-tag").forEach((node) => {
                if (node.closest("[data-omniyap-tag-for]") !== el) node.remove();
            });
            if (!userId) return;
            const tag = tagOf(userId);
            const head = el.querySelector(".msg-head");
            if (!tag || !head) return;
            if (head.querySelector(`[data-omniyap-tag-for="${CSS.escape(userId)}"]`)) return;
            const wrapper = badge(tag);
            wrapper.dataset.omniyapTagFor = userId;
            head.querySelector(".msg-author")?.after(wrapper);
        };

        const action = ({ el, message }) => {
            if (el.querySelector('[data-omniyap-action="Tag"]')) return;
            const author = authorOf(el);
            const userId = message?.author_id || message?.user_id || author.id;
            if (!userId) return;
            addMessageAction(el, {
                label: "Tag",
                title: "Give this person a local tag",
                html: "◷",
                onClick: () => {
                    edit(userId, author.name || store.displayName(userId), () => {
                        messages.refresh();
                        ctx.toast("Tag saved", { type: "success" });
                    });
                },
            });
        };

        const openList = () => {
            const entries = Object.entries(tags.read());
            openModal({
                title: "Friend tags",
                subtitle: `${entries.length} tagged`,
                width: 560,
                body: entries.length ? h("div", {}, ...entries.map(([userId, tag]) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" }, h("b", {}, store.displayName(userId) || userId), h("span", {}, `@${store.username(userId) || userId}`)),
                    h("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
                        badge(tag),
                        h("button", { class: "omniyap-btn", onclick: () => edit(userId, store.displayName(userId), openList) }, "Edit"),
                    ),
                ))) : h("div", { class: "omniyap-empty" }, "No tags yet. Use the ◷ action on a message."),
            });
        };

        ctx.cleanup(messages.decorate((info) => {
            decorate(info);
            action(info);
        }));
        ctx.cleanup(ui.registerTool({
            id: "friend-tags",
            label: "Friend tags",
            icon: "◷",
            description: "Coloured tags beside friends' names.",
            onClick: openList,
        }));
        ctx.css(`
            .omniyap-friend-tag{margin-left:6px;padding:1px 6px;border-radius:999px;border:1px solid;
                font:600 9.5px Inter,system-ui,sans-serif;letter-spacing:.02em;vertical-align:1px}
            [data-omniyap-action="Tag"]{font-size:12px;width:26px;height:26px;padding:0}
        `);
    },
});
