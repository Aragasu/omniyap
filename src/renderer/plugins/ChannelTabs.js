import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, localJson } from "./_shared.js";

const recent = localJson("channel-tabs", []);

const settings = definePluginSettings({
    maxTabs: { type: OptionType.SLIDER, description: "How many recent channels to keep.", default: 8, min: 3, max: 16, step: 1 },
    showDms: { type: OptionType.BOOLEAN, description: "Include direct messages.", default: true },
});

export default definePlugin({
    name: "ChannelTabs",
    description: "Adds a tab strip of recently opened channels under the chat header, plus Ctrl+Tab cycling.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "chat"],
    settings,

    start(ctx) {
        let bar = null;

        const remember = (channelId) => {
            if (!channelId) return;
            const channel = store.channel(channelId);
            if (!channel || (!settings.store.showDms && !channel.server_id)) return;
            const list = recent.read().filter((id) => id !== channelId);
            list.unshift(channelId);
            recent.write(list.slice(0, Math.max(3, Math.min(16, Number(settings.store.maxTabs) || 8))));
        };

        const render = () => {
            const head = document.querySelector("header.main-head, .chat .main-head");
            if (!head) return;
            if (!bar || !bar.isConnected) {
                bar = h("div", { class: "omniyap-tabs", role: "tablist", "aria-label": "Recent channels" });
                head.insertAdjacentElement("afterend", bar);
            }
            const ids = recent.read().filter((id) => store.channel(id));
            if (!ids.length) {
                bar.replaceChildren(h("span", { class: "omniyap-tabs-empty" }, "Open a few channels to build tabs."));
                return;
            }
            bar.replaceChildren(...ids.map((id) => {
                const active = id === store.activeChannelId();
                const name = store.channelName(id) || "channel";
                return h("div", { class: "omniyap-tab" + (active ? " active" : ""), role: "tab", "aria-selected": String(active) },
                    h("button", {
                        class: "omniyap-tab-name",
                        title: name,
                        onclick: () => {
                            try {
                                store.setState({ activeChannelId: id });
                            } catch (err) {
                                ctx.log.warn("could not switch tab", err);
                            }
                        },
                    }, name),
                    h("button", {
                        class: "omniyap-tab-close",
                        title: "Close tab",
                        "aria-label": `Close ${name}`,
                        onclick: (event) => {
                            event.stopPropagation();
                            recent.write(recent.read().filter((entry) => entry !== id));
                            render();
                        },
                    }, "×"),
                );
            }));
        };

        const cycle = (direction) => {
            const ids = recent.read().filter((id) => store.channel(id));
            if (ids.length < 2) return;
            const index = Math.max(0, ids.indexOf(store.activeChannelId()));
            const next = ids[(index + direction + ids.length) % ids.length];
            if (next) store.setState({ activeChannelId: next });
        };

        const onKey = (event) => {
            if (!event.ctrlKey || event.key !== "Tab" || event.altKey) return;
            event.preventDefault();
            event.stopPropagation();
            cycle(event.shiftKey ? -1 : 1);
        };

        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId !== previous.activeChannelId) {
                remember(state.activeChannelId);
                render();
            }
        });
        ctx.watch("header.main-head", render);
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            bar?.remove();
        });
        ctx.css(`
            .omniyap-tabs{display:flex;align-items:center;gap:4px;padding:5px 10px;overflow-x:auto;scrollbar-width:none;
                border-bottom:1px solid rgba(255,255,255,.06);background:rgba(15,15,22,.55);flex:none}
            .omniyap-tabs::-webkit-scrollbar{display:none}
            .omniyap-tabs-empty{font:500 11px Inter,system-ui,sans-serif;color:#6f7280;padding:2px 4px}
            .omniyap-tab{display:flex;align-items:center;flex:none;max-width:180px;border-radius:7px;
                background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}
            .omniyap-tab.active{background:rgba(139,57,253,.16);border-color:rgba(139,57,253,.4)}
            .omniyap-tab-name{border:0;background:transparent;color:#b7b9c2;font:500 11.5px Inter,system-ui,sans-serif;
                padding:4px 8px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}
            .omniyap-tab.active .omniyap-tab-name{color:#e2d3ff}
            .omniyap-tab-close{border:0;background:transparent;color:#71737e;font-size:13px;line-height:1;padding:3px 6px;cursor:pointer}
            .omniyap-tab-close:hover{color:#ff9b9b}
        `);
        remember(store.activeChannelId());
        render();
    },
});
