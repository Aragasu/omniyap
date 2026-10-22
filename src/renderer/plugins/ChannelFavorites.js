import { definePlugin, store } from "../core/api.js";
import { h, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const favorites = localJson("favorite-channels", []);
const read = () => (Array.isArray(favorites.read()) ? favorites.read() : []);

function jump(id) {
    try {
        store.setState({ activeChannelId: id });
    } catch (err) {
        window.OmniYap?.log?.warn?.("could not open favorite", err);
    }
}

function openList() {
    const ids = read().filter((id) => store.channel(id));
    const render = (body) => {
        body.replaceChildren(ids.length ? h("div", {}, ...ids.map((id) => h("div", { class: "omniyap-row" },
            h("div", { class: "label" },
                h("b", {}, store.channelName(id) || "Channel"),
                h("span", {}, store.channel(id)?.server_id ? store.server(store.channel(id).server_id)?.name || "Server" : "Direct message"),
            ),
            h("div", { style: { display: "flex", gap: "6px" } },
                h("button", { class: "omniyap-btn primary", onclick: () => jump(id) }, "Open"),
                h("button", {
                    class: "omniyap-btn",
                    onclick: (event) => {
                        favorites.write(read().filter((entry) => entry !== id));
                        document.querySelectorAll(`.channel-row[data-nav-chan="${CSS.escape(id)}"]`).forEach((row) => row.removeAttribute("data-omniyap-fav"));
                        ids.splice(ids.indexOf(id), 1);
                        render(event.currentTarget.closest(".omniyap-modal-body"));
                    },
                }, "Unstar"),
            ),
        ))) : h("div", { class: "omniyap-empty" }, "No favorite channels yet. Use the star that appears on hover."));
    };
    openModal({ title: "Favorite channels", subtitle: "Starred on this device", width: 580, body: h("div"), onMount: render });
}

export default definePlugin({
    name: "ChannelFavorites",
    description: "Stars the channels you keep coming back to, marks them in the sidebar and keeps them in one list.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "servers"],
    settings: undefined,

    start(ctx) {
        const sync = () => {
            const ids = new Set(read());
            document.querySelectorAll(".channel-row[data-nav-chan]").forEach((row) => {
                const id = row.getAttribute("data-nav-chan");
                const fav = ids.has(id);
                row.toggleAttribute("data-omniyap-fav", fav);
                const host = row.querySelector(".channel-tools") || row;
                let star = host.querySelector(".omniyap-fav-star");
                if (!star) {
                    star = h("button", {
                        type: "button",
                        class: `omniyap-fav-star${host === row ? " floating" : ""}`,
                        title: "Star this channel",
                        "aria-label": "Star this channel",
                        onclick: (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const current = read();
                            if (current.includes(id)) favorites.write(current.filter((entry) => entry !== id));
                            else favorites.write([...current, id]);
                            sync();
                        },
                    }, "★");
                    host.appendChild(star);
                }
                star.classList.toggle("on", fav);
                star.title = fav ? "Remove from favorites" : "Star this channel";
            });
        };

        ctx.onMutate(sync);
        ctx.cleanup(() => {
            document.querySelectorAll(".omniyap-fav-star").forEach((node) => node.remove());
            document.querySelectorAll("[data-omniyap-fav]").forEach((row) => row.removeAttribute("data-omniyap-fav"));
        });
        ctx.cleanup(ui.registerTool({
            id: "favorite-channels",
            label: "Favorite channels",
            icon: "★",
            description: "Your starred channels.",
            onClick: openList,
        }));
        ctx.css(`
            .channel-row[data-nav-chan]{position:relative}
            .omniyap-fav-star{border:0;background:transparent;color:#5f6270;font-size:11px;cursor:pointer;padding:0 2px;line-height:1}
            .omniyap-fav-star.floating{position:absolute;right:5px;top:50%;transform:translateY(-50%);z-index:2;
                opacity:0;transition:opacity .12s}
            .channel-row:hover .omniyap-fav-star.floating{opacity:1}
            .omniyap-fav-star.floating.on{opacity:1}
            .omniyap-fav-star:hover{color:#f0c35d}
            .omniyap-fav-star.on{color:#f0c35d}
            .channel-row[data-omniyap-fav] > .channel-main .name{color:#f4dc9b}
        `);
        sync();
    },
});
