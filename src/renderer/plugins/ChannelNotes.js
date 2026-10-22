import { definePlugin, store } from "../core/api.js";
import { h, headerButton, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const notes = localJson("channel-notes", {});

function edit(channelId) {
    const channel = store.channel(channelId);
    if (!channel) return;
    const area = h("textarea", {
        class: "omniyap-css",
        style: { minHeight: "240px" },
        placeholder: "Private notes about this channel — links, context, reminders…",
    }, notes.read()[channelId]?.text || "");
    openModal({
        title: `Notes · #${store.channelName(channelId)}`,
        subtitle: "Stored only on this device",
        width: 640,
        body: area,
        actions: [
            {
                label: "Delete",
                onClick: ({ close }) => {
                    const all = notes.read();
                    delete all[channelId];
                    notes.write(all);
                    close();
                },
            },
            {
                label: "Save",
                primary: true,
                onClick: ({ close }) => {
                    const all = notes.read();
                    if (area.value.trim()) all[channelId] = { text: area.value, at: Date.now() };
                    else delete all[channelId];
                    notes.write(all);
                    close();
                },
            },
        ],
    });
}

export default definePlugin({
    name: "ChannelNotes",
    description: "Keeps a private notepad for each channel, opened from the chat header.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "productivity", "utility"],
    settings: undefined,

    start(ctx) {
        const mount = () => {
            const channelId = store.activeChannelId();
            if (!channelId) return;
            let button = document.querySelector(".omniyap-channel-notes");
            if (!button) {
                button = headerButton({
                    className: "omniyap-channel-notes",
                    title: "Channel notes",
                    text: "✎",
                    onClick: () => edit(store.activeChannelId()),
                });
            }
            if (!button) return;
            const has = !!notes.read()[channelId];
            button.classList.toggle("has-note", has);
            button.title = has ? "Edit channel notes" : "Add a note to this channel";
        };

        const openAll = () => {
            const all = notes.read();
            const rows = Object.entries(all).filter(([id]) => store.channel(id));
            openModal({
                title: "Channel notes",
                subtitle: `${rows.length} channels with notes`,
                width: 620,
                body: rows.length ? h("div", {}, ...rows.map(([channelId, note]) => h("div", { class: "omniyap-row", style: { alignItems: "flex-start" } },
                    h("div", { class: "label", style: { minWidth: 0 } },
                        h("b", {}, `#${store.channelName(channelId)}`),
                        h("span", { style: { whiteSpace: "pre-wrap" } }, String(note.text || "").slice(0, 240)),
                    ),
                    h("button", { class: "omniyap-btn", onclick: () => edit(channelId) }, "Open"),
                ))) : h("div", { class: "omniyap-empty" }, "No channel notes yet."),
            });
        };

        ctx.watch("header.main-head", mount);
        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId !== previous.activeChannelId) mount();
        });
        ctx.cleanup(ui.registerTool({
            id: "channel-notes",
            label: "Channel notes",
            icon: "✎",
            description: "Private notes attached to channels.",
            onClick: openAll,
        }));
        ctx.cleanup(() => document.querySelector(".omniyap-channel-notes")?.remove());
        ctx.css(`
            .omniyap-channel-notes{font-size:13px;width:26px;height:26px;padding:0;color:#8f93a3}
            .omniyap-channel-notes.has-note{color:#f5c46b;border-color:rgba(245,165,36,.35)}
        `);
        mount();
    },
});
