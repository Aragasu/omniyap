import { definePlugin, messages, store, dom } from "../core/api.js";
import { h, addMessageAction, authorOf, localJson, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const hidden = localJson("hidden-messages", []);

function hide(info) {
    const id = info.el.getAttribute("data-message-id");
    if (!id) return;
    const list = hidden.read();
    if (list.some((entry) => entry.id === id)) return;
    list.push({
        id,
        channelId: store.activeChannelId(),
        channelName: store.channelName(store.activeChannelId()),
        author: authorOf(info.el).name,
        text: (info.textEl?.innerText || "").slice(0, 240),
        at: Date.now(),
    });
    hidden.write(list.slice(-500));
    info.el.setAttribute("data-omniyap-hidden-msg", "1");
    dom.toast("Message hidden. Restore it from Tools → Hidden messages.");
}

function openManager() {
    const list = hidden.read().slice().reverse();
    const render = (body) => {
        body.replaceChildren(list.length ? h("div", {}, ...list.map((entry) => h("div", { class: "omniyap-row" },
            h("div", { class: "label", style: { minWidth: 0 } },
                h("b", {}, entry.author || "unknown"),
                h("span", { style: { whiteSpace: "normal" } }, entry.text || "(no text)"),
                h("span", {}, `${formatTime(entry.at)}${entry.channelName ? ` · #${entry.channelName}` : ""}`),
            ),
            h("button", {
                class: "omniyap-btn",
                onclick: () => {
                    hidden.write(hidden.read().filter((row) => row.id !== entry.id));
                    document.querySelectorAll(`.msg[data-message-id="${CSS.escape(entry.id)}"]`).forEach((row) => row.removeAttribute("data-omniyap-hidden-msg"));
                    list.splice(list.indexOf(entry), 1);
                    render(body);
                },
            }, "Restore"),
        ))) : h("div", { class: "omniyap-empty" }, "Nothing is hidden. Use the Hide action on a message."));
    };
    openModal({
        title: "Hidden messages",
        subtitle: "Only hidden on this device",
        width: 640,
        body: h("div"),
        onMount: (body) => render(body),
        actions: [{
            label: "Unhide all",
            onClick: ({ close }) => {
                hidden.write([]);
                document.querySelectorAll("[data-omniyap-hidden-msg]").forEach((row) => row.removeAttribute("data-omniyap-hidden-msg"));
                close();
            },
        }],
    });
}

export default definePlugin({
    name: "HideMessages",
    description: "Hides individual messages on your screen and keeps them in a restore list.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "privacy", "utility"],
    settings: undefined,

    start(ctx) {
        const apply = () => {
            const ids = new Set(hidden.read().map((entry) => entry.id));
            document.querySelectorAll(".msg[data-message-id]").forEach((row) => {
                const id = row.getAttribute("data-message-id");
                row.toggleAttribute("data-omniyap-hidden-msg", ids.has(id));
            });
        };

        const decorate = (info) => {
            if (info.el.querySelector('[data-omniyap-action="Hide"]')) return;
            addMessageAction(info.el, {
                label: "Hide",
                title: "Hide this message on this device",
                html: "⊘",
                onClick: () => {
                    hide(info);
                    apply();
                },
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.onMutate(apply);
        ctx.on("store:change", apply);
        ctx.cleanup(ui.registerTool({
            id: "hidden-messages",
            label: "Hidden messages",
            icon: "⊘",
            description: "Restore messages you hid.",
            onClick: openManager,
        }));
        ctx.css(`
            .msg[data-omniyap-hidden-msg]{display:none!important}
            [data-omniyap-action="Hide"]{font-size:13px;width:26px;height:26px;padding:0}
        `);
        apply();
    },
});
