import { definePlugin, store } from "../core/api.js";
import { h, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const aliases = localJson("channel-aliases", {});
const read = () => {
    const value = aliases.read();
    return value && typeof value === "object" ? value : {};
};

function apply() {
    const saved = read();
    document.querySelectorAll(".channel-row[data-nav-chan]").forEach((row) => {
        const id = row.getAttribute("data-nav-chan");
        const name = row.querySelector(".channel-main .name");
        if (!name) return;
        if (!name.dataset.omniyapOriginal) name.dataset.omniyapOriginal = name.textContent;
        const label = saved[id] || name.dataset.omniyapOriginal;
        if (name.textContent !== label) name.textContent = label;
    });
    const active = store.activeChannelId();
    const title = document.querySelector(".main-head .title-btn");
    if (title && active) {
        if (!title.dataset.omniyapOriginal) title.dataset.omniyapOriginal = title.textContent;
        const label = saved[active] || title.dataset.omniyapOriginal;
        if (title.textContent !== label) title.textContent = label;
    }
}

function openEditor() {
    const state = store.getState();
    const channels = Object.entries(state?.channels || {}).filter(([, channel]) => channel);
    const select = h("select", { class: "omniyap-search", style: { width: "100%" } },
        ...channels.map(([id, channel]) => h("option", { value: id }, `${channel.name || "Direct message"}${channel.server_id ? "" : " (DM)"}`)),
    );
    const input = h("input", { class: "omniyap-search", style: { width: "100%" }, placeholder: "New display name" });
    const list = h("div");
    const renderList = () => {
        const saved = read();
        const entries = Object.entries(saved);
        list.replaceChildren(entries.length ? h("div", {}, ...entries.map(([id, alias]) => h("div", { class: "omniyap-row" },
            h("div", { class: "label" }, h("b", {}, alias), h("span", {}, store.channelName(id) || "Deleted channel")),
            h("button", { class: "omniyap-btn", onclick: () => {
                const next = read();
                delete next[id];
                aliases.write(next);
                apply();
                renderList();
            } }, "Remove"),
        ))) : h("div", { class: "omniyap-empty" }, "No aliases yet."));
    };
    openModal({
        title: "Channel aliases",
        subtitle: "Rename channels on this device",
        width: 520,
        body: h("div", {},
            h("div", { class: "omniyap-muted", style: { marginBottom: "6px" } }, "Pick a channel and give it a name you actually remember."),
            select,
            h("div", { style: { height: "8px" } }),
            input,
            h("div", { style: { height: "12px" } }),
            h("button", {
                class: "omniyap-btn primary",
                onclick: () => {
                    const id = select.value;
                    const value = input.value.trim();
                    if (!id || !value) return;
                    aliases.write({ ...read(), [id]: value });
                    input.value = "";
                    apply();
                    renderList();
                },
            }, "Save alias"),
            h("div", { style: { height: "16px" } }),
            list,
        ),
        onMount: renderList,
    });
}

export default definePlugin({
    name: "ChannelAliases",
    description: "Gives channels a private display name that only you see in the sidebar and header, without changing the real channel.",
    authors: [{ name: "OmniYap" }],
    tags: ["servers", "appearance", "utility"],

    start(ctx) {
        ctx.onMutate(apply);
        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId !== previous.activeChannelId) apply();
        });
        ctx.cleanup(ui.registerTool({
            id: "channel-aliases",
            label: "Channel aliases",
            icon: "#",
            description: "Rename channels just for you.",
            onClick: openEditor,
        }));
        ctx.cleanup(() => {
            document.querySelectorAll("[data-omniyap-original]").forEach((node) => {
                const original = node.dataset.omniyapOriginal;
                if (original) node.textContent = original;
                delete node.dataset.omniyapOriginal;
            });
        });
        apply();
    },
});
