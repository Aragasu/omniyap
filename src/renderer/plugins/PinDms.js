import { definePlugin, store } from "../core/api.js";
import { h, headerButton, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const pinned = localJson("pinned-dms", []);

function pinnedChannels() {
    return pinned.read().map((id) => store.channel(id)).filter(Boolean);
}

export default definePlugin({
    name: "PinDms",
    description: "Pins direct messages to a local shortcut list so they stay one click away.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "chat", "utility"],

    start(ctx) {
        const toggle = (channelId) => {
            const list = pinned.read();
            pinned.write(list.includes(channelId) ? list.filter((id) => id !== channelId) : [...list, channelId]);
        };

        const open = () => {
            const channelId = store.activeChannelId();
            const isDm = channelId && store.isDmChannel(channelId);
            const list = pinnedChannels();
            openModal({
                title: "Pinned DMs",
                subtitle: `${list.length} pinned`,
                width: 520,
                body: h("div", {},
                    isDm ? h("button", {
                        class: "omniyap-btn primary",
                        style: { marginBottom: "10px" },
                        onclick: () => {
                            toggle(channelId);
                            open();
                        },
                    }, pinned.read().includes(channelId) ? `Unpin ${store.channelName(channelId)}` : `Pin ${store.channelName(channelId)}`) : null,
                    list.length ? h("div", {}, ...list.map((channel) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" },
                            h("b", {}, store.channelName(channel.id) || "Direct message"),
                            h("span", {}, pinned.read().indexOf(channel.id) === 0 ? "First shortcut" : "Pinned"),
                        ),
                        h("div", { style: { display: "flex", gap: "6px" } },
                            h("button", {
                                class: "omniyap-btn",
                                onclick: () => {
                                    store.setState({ activeChannelId: channel.id });
                                    document.querySelector(".omniyap-modal-root:not([hidden]) .omniyap-modal-head .icon-btn")?.click();
                                },
                            }, "Open"),
                            h("button", {
                                class: "omniyap-btn",
                                onclick: () => {
                                    toggle(channel.id);
                                    open();
                                },
                            }, "Unpin"),
                        ),
                    ))) : h("div", { class: "omniyap-empty" }, "Open a DM and use this button to pin it."),
                ),
            });
        };

        const mount = () => headerButton({
            className: "omniyap-pin-dms",
            title: "Pinned DMs",
            text: "📌",
            onClick: open,
        });

        ctx.watch("header.main-head", mount);
        ctx.cleanup(ui.registerTool({
            id: "pinned-dms",
            label: "Pinned DMs",
            icon: "📌",
            description: "Your pinned direct messages.",
            onClick: open,
        }));
        ctx.css(`
            .omniyap-pin-dms{font-size:12px;width:26px;height:26px;padding:0;filter:grayscale(1);opacity:.75}
            .omniyap-pin-dms:hover{filter:none;opacity:1}
        `);
        mount();
    },
});
