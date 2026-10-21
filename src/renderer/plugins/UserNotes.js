import { definePlugin, messages, store } from "../core/api.js";
import { h, addMessageAction, authorOf, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const notes = localJson("user-notes", {});

function openNote(userId, name, onSave) {
    const current = notes.read()[userId] || "";
    const area = h("textarea", {
        class: "omniyap-css",
        style: { minHeight: "160px" },
        placeholder: `Private notes about ${name}…`,
    }, current);
    openModal({
        title: name,
        subtitle: "Only stored on this device",
        width: 520,
        body: area,
        actions: [
            {
                label: "Delete note",
                onClick: () => {
                    const all = notes.read();
                    delete all[userId];
                    notes.write(all);
                    onSave?.();
                    close();
                },
            },
            {
                label: "Save",
                primary: true,
                onClick: ({ close: done }) => {
                    const all = notes.read();
                    if (area.value.trim()) all[userId] = area.value;
                    else delete all[userId];
                    notes.write(all);
                    onSave?.();
                    done();
                },
            },
        ],
    });
}

export default definePlugin({
    name: "UserNotes",
    description: "Keep private notes about people, stored locally.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "productivity"],

    start(ctx) {
        const decorate = ({ el, message }) => {
            if (el.querySelector('[data-omniyap-action="Note"]')) return;
            const author = authorOf(el);
            const userId = message?.author_id || message?.user_id || author.id;
            if (!userId) return;
            addMessageAction(el, {
                label: "Note",
                title: "Edit a private note about this user",
                html: "✎",
                onClick: () => openNote(userId, author.name || "User", () => ctx.toast("Note saved", { type: "success" })),
            });
        };
        ctx.cleanup(messages.decorate(decorate));

        const showBadge = () => {
            document.querySelectorAll(".members-panel .pick-row").forEach((row) => {
                const name = row.querySelector(".pick-row-name")?.textContent?.trim();
                if (!name) return;
                const all = notes.read();
                const has = Object.entries(all).some(([id, text]) => text && store.displayName(id) === name);
                let badge = row.querySelector(".omniyap-note-dot");
                if (has && !badge) {
                    badge = h("span", { class: "omniyap-note-dot", title: "You have a note about this user" }, "✎");
                    row.querySelector(".pick-row-name")?.appendChild(badge);
                } else if (!has && badge) {
                    badge.remove();
                }
            });
        };
        ctx.onMutate(showBadge);
        ctx.interval(showBadge, 2500);

        ctx.css(`
            [data-omniyap-action="Note"]{font-size:12px;width:26px;height:26px;padding:0}
            .omniyap-note-dot{margin-left:4px;color:#ffb454;font-size:10px;flex:none}
        `);
    },
});
