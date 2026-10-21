import { definePlugin, store } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";

function score(query, text) {
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    if (!needle) return 1;
    if (haystack === needle) return 1000;
    if (haystack.startsWith(needle)) return 800;
    if (haystack.includes(needle)) return 600;
    // Simple subsequence match (qsw -> "quick switcher").
    let index = 0;
    let points = 0;
    for (const char of needle) {
        const found = haystack.indexOf(char, index);
        if (found < 0) return 0;
        points += 100 - Math.min(90, found - index);
        index = found + 1;
    }
    return points;
}

export default definePlugin({
    name: "QuickSwitcher",
    description: "Press Ctrl+K to jump to any channel with fuzzy search.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "utility"],

    start(ctx) {
        const open = () => {
            const state = store.getState();
            if (!state?.channels) {
                ctx.toast("Yapper is still loading", { type: "info" });
                return;
            }

            const entries = Object.values(state.channels).map((channel) => {
                const server = channel.server_id ? store.server(channel.server_id) : null;
                const isDm = !channel.server_id;
                const name = isDm ? store.channelName(channel.id) : channel.name;
                return {
                    id: channel.id,
                    name: name || "channel",
                    hint: isDm ? "Direct message" : server?.name || "Server",
                    isDm,
                };
            });

            const list = h("div", { class: "omniyap-switcher-list" });
            const input = h("input", {
                class: "omniyap-switcher-input",
                placeholder: "Jump to a channel…",
                spellcheck: false,
            });

            let filtered = entries.slice(0, 40);
            let selected = 0;

            const choose = (entry) => {
                if (!entry) return;
                try {
                    store.setState({ activeChannelId: entry.id });
                } catch (err) {
                    ctx.log.warn("could not switch channel", err);
                }
                close();
            };

            const render = () => {
                filtered = entries
                    .map((entry) => ({ entry, score: score(input.value.trim(), `${entry.name} ${entry.hint}`) }))
                    .filter((row) => row.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 40)
                    .map((row) => row.entry);
                if (selected >= filtered.length) selected = Math.max(0, filtered.length - 1);
                list.replaceChildren(...filtered.map((entry, index) =>
                    h("button", {
                        class: "omniyap-switcher-row" + (index === selected ? " active" : ""),
                        onmousedown: (event) => {
                            event.preventDefault();
                            choose(entry);
                        },
                    },
                        h("span", { class: "hash" }, entry.isDm ? "@" : "#"),
                        h("span", { class: "name" }, entry.name),
                        h("span", { class: "hint" }, entry.hint),
                    ),
                ));
                if (!filtered.length) list.replaceChildren(h("div", { class: "omniyap-muted", style: { padding: "16px" } }, "No channels match."));
            };

            input.addEventListener("input", () => {
                selected = 0;
                render();
            });
            input.addEventListener("keydown", (event) => {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    selected = Math.min(filtered.length - 1, selected + 1);
                    render();
                } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    selected = Math.max(0, selected - 1);
                    render();
                } else if (event.key === "Enter") {
                    event.preventDefault();
                    choose(filtered[selected]);
                }
            });

            const { close } = openModal({
                title: "Quick switch",
                subtitle: "Ctrl+K",
                width: 560,
                body: h("div", { class: "omniyap-switcher" }, input, list),
                onMount: () => {
                    render();
                    input.focus();
                },
            });
        };

        const onKey = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                event.stopPropagation();
                open();
            }
        };
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));

        ctx.css(`
            .omniyap-switcher-input{width:100%;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);
                background:#12121a;color:#ececf1;font:13px Inter,system-ui,sans-serif;outline:none;margin-bottom:10px}
            .omniyap-switcher-input:focus{border-color:#8b39fd}
            .omniyap-switcher-list{display:flex;flex-direction:column;gap:2px;max-height:46vh;overflow:auto}
            .omniyap-switcher-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border:0;border-radius:7px;
                background:transparent;color:#c9cbd4;font:500 12.5px Inter,system-ui,sans-serif;cursor:pointer;text-align:left}
            .omniyap-switcher-row:hover,.omniyap-switcher-row.active{background:rgba(139,57,253,.16);color:#fff}
            .omniyap-switcher-row .hash{color:#7c7f8a;width:12px;text-align:center}
            .omniyap-switcher-row .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .omniyap-switcher-row .hint{font-size:10.5px;color:#7c7f8a}
        `);
    },
});
