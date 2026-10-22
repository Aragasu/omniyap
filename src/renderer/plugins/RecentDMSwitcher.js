import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const recent = localJson("recent-dms", []);

const settings = definePluginSettings({
    limit: { type: OptionType.SLIDER, description: "How many recent DMs to remember.", default: 12, min: 4, max: 30, step: 1 },
    shortcut: { type: OptionType.BOOLEAN, description: "Enable Ctrl+Alt+↑/↓ cycling.", default: true },
});

export default definePlugin({
    name: "RecentDMSwitcher",
    description: "Cycles through your recently opened direct messages with Ctrl+Alt+↑/↓.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "chat", "utility"],
    settings,

    start(ctx) {
        const remember = (channelId) => {
            if (!channelId || !store.isDmChannel(channelId)) return;
            const list = recent.read().filter((id) => id !== channelId);
            list.unshift(channelId);
            recent.write(list.slice(0, Math.max(4, Math.min(30, Number(settings.store.limit) || 12))));
        };

        const cycle = (direction) => {
            const ids = recent.read().filter((id) => store.channel(id) && store.isDmChannel(id));
            if (!ids.length) return ctx.toast("No recent DMs yet");
            const index = Math.max(0, ids.indexOf(store.activeChannelId()));
            const next = ids[(index + direction + ids.length) % ids.length];
            if (!next) return;
            store.setState({ activeChannelId: next });
            ctx.toast(store.channelName(next));
        };

        const onKey = (event) => {
            if (!settings.store.shortcut || !event.ctrlKey || !event.altKey) return;
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            cycle(event.key === "ArrowDown" ? 1 : -1);
        };

        const open = () => {
            const ids = recent.read().filter((id) => store.channel(id));
            openModal({
                title: "Recent DMs",
                subtitle: "Most recent first",
                width: 520,
                body: ids.length ? h("div", {}, ...ids.map((id) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" }, h("b", {}, store.channelName(id)), h("span", {}, "Direct message")),
                    h("button", {
                        class: "omniyap-btn",
                        onclick: () => {
                            store.setState({ activeChannelId: id });
                            document.querySelector(".omniyap-modal-root:not([hidden]) .omniyap-modal-head .icon-btn")?.click();
                        },
                    }, "Open"),
                ))) : h("div", { class: "omniyap-empty" }, "Open a DM first."),
            });
        };

        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId !== previous.activeChannelId) remember(state.activeChannelId);
        });
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(ui.registerTool({
            id: "recent-dms",
            label: "Recent DMs",
            icon: "↔",
            description: "Jump back into a direct message you had open recently.",
            onClick: open,
        }));
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
        remember(store.activeChannelId());
    },
});
