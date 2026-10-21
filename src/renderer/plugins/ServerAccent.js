import { definePlugin, definePluginSettings, OptionType, store, dom } from "../core/api.js";
import { h, localJson } from "./_shared.js";

const colors = localJson("server-accents", {});
const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ""));

function rgb(hex) {
    return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function shade(hex, factor) {
    return "#" + rgb(hex)
        .map((value) => Math.max(0, Math.min(255, Math.round(value * factor))).toString(16).padStart(2, "0"))
        .join("");
}

function readableOn(hex) {
    const [r, g, b] = rgb(hex).map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#14151a" : "#ffffff";
}

function setColor(serverId, color) {
    const map = { ...colors.read() };
    if (isHex(color)) map[serverId] = color;
    else delete map[serverId];
    colors.write(map);
}

const settings = definePluginSettings({
    manager: {
        type: OptionType.CUSTOM,
        default: "",
        description: "Pick a colour for each server.",
        render(box) {
            box.style.flexDirection = "column";
            box.style.alignItems = "stretch";
            const list = h("div", {});

            const draw = () => {
                const servers = Object.values(store.servers())
                    .filter(Boolean)
                    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
                const map = colors.read();
                list.replaceChildren(
                    ...servers.map((server) => {
                        const current = isHex(map[server.id]) ? map[server.id] : "#8b39fd";
                        return h("div", { style: { display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" } },
                            h("input", {
                                type: "color",
                                value: current,
                                "aria-label": `Colour for ${server.name}`,
                                style: { width: "40px", height: "28px", padding: 0, border: 0, background: "none" },
                                oninput: (event) => {
                                    setColor(server.id, event.target.value);
                                    paint();
                                },
                            }),
                            h("span", { style: { flex: "1", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, server.name),
                            isHex(map[server.id])
                                ? h("button", {
                                    class: "omniyap-btn",
                                    onclick: () => {
                                        setColor(server.id, "");
                                        draw();
                                        paint();
                                    },
                                }, "Reset")
                                : h("span", { class: "omniyap-muted" }, "normal"),
                        );
                    }),
                    servers.length ? null : h("div", { class: "omniyap-muted" }, "Your servers appear here once Yapper has loaded them."),
                );
            };

            draw();
            box.append(list);
        },
    },
});

function paint() {
    const map = colors.read();
    const serverId = store.activeChannel()?.server_id;
    const color = serverId ? map[serverId] : null;
    let style = document.getElementById("omniyap-server-accent");
    if (!isHex(color)) {
        style?.remove();
        return;
    }
    if (!style) {
        style = document.createElement("style");
        style.id = "omniyap-server-accent";
        document.head.appendChild(style);
    }
    style.textContent = `:root{--accent:${color};--accent-hover:${shade(color, 0.86)};--accent-soft:${color}29;--on-accent:${readableOn(color)}}`;
}

export default definePlugin({
    name: "ServerAccent",
    description: "Gives each server its own accent colour. Buttons, highlights and unread dots change when you open that server. Only you see it.",
    authors: [{ name: "OmniYap" }],
    tags: ["servers", "appearance", "customisation"],
    settings,

    start(ctx) {
        paint();
        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId !== previous.activeChannelId) paint();
        });
        ctx.cleanup(dom.onMutate(() => {
            if (settings.store.manager && store.isReady) {
                // Keep the settings manager fresh while it is open.
                const box = document.querySelector('[data-omniyap-plugin="ServerAccent"]');
                if (box) box.dispatchEvent(new CustomEvent("omniyap:refresh"));
            }
        }));
        ctx.cleanup(() => document.getElementById("omniyap-server-accent")?.remove());
    },
});

export { paint, setColor };
