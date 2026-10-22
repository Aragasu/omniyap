import { definePlugin, messages, store } from "../core/api.js";
import { h, localJson, addMessageAction, messageAuthorId } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const aliases = localJson("nicknames", {});
const read = () => {
    const value = aliases.read();
    return value && typeof value === "object" ? value : {};
};

function applyMembers() {
    const saved = read();
    document.querySelectorAll(".pick-row-name .nf, .friend-name .nf").forEach((name) => {
        const button = name.closest("button");
        const label = button?.getAttribute("aria-label") || "";
        let userId = null;
        for (const id of Object.keys(saved)) {
            if (label.startsWith(`${store.displayName(id)}`) || label.startsWith(`${store.username(id)}`)) userId = id;
        }
        if (!userId) return;
        if (!name.dataset.omniyapOriginal) name.dataset.omniyapOriginal = name.textContent;
        if (name.textContent !== saved[userId]) name.textContent = saved[userId];
    });
}

function promptFor(info) {
    const id = messageAuthorId(info.message);
    if (!id) {
        window.OmniYap?.log?.warn?.("nickname: no author id");
        return;
    }
    const original = info.el.querySelector(".msg-author")?.textContent?.trim() || store.displayName(id);
    const input = h("input", {
        class: "omniyap-search",
        style: { width: "100%" },
        placeholder: original,
        value: read()[id] || "",
    });
    const save = (close) => {
        const saved = read();
        const value = input.value.trim();
        if (value) saved[id] = value;
        else delete saved[id];
        aliases.write(saved);
        messages.refresh();
        applyMembers();
        close();
    };
    openModal({
        title: "Local nickname",
        subtitle: `${original} · only visible to you`,
        width: 420,
        body: h("div", {},
            h("p", { class: "omniyap-muted", style: { marginTop: 0 } }, "Yapper still shows their real name to everyone else."),
            input,
        ),
        actions: [
            { label: "Clear", onClick: ({ close }) => { input.value = ""; save(close); } },
            { label: "Save", primary: true, onClick: ({ close }) => save(close) },
        ],
        onMount: () => setTimeout(() => input.focus(), 30),
    });
}

export default definePlugin({
    name: "LocalNicknames",
    description: "Gives anyone a private nickname that only you see in chat, the member list and your friends list.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "people", "privacy"],

    start(ctx) {
        const decorate = (info) => {
            const id = messageAuthorId(info.message);
            if (!id) return;
            const saved = read();
            const author = info.head?.querySelector(".msg-author");
            if (author) {
                if (!author.dataset.omniyapOriginal) author.dataset.omniyapOriginal = author.textContent;
                const wanted = saved[id];
                const next = wanted || author.dataset.omniyapOriginal;
                if (author.textContent !== next) author.textContent = next;
                author.title = wanted ? `Nicknamed from ${author.dataset.omniyapOriginal}` : "";
            }
            if (!info.el.querySelector('[data-omniyap-action="Nickname"]')) {
                addMessageAction(info.el, {
                    label: "Nickname",
                    title: "Give this person a local nickname",
                    html: "✎",
                    onClick: () => promptFor(info),
                });
            }
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.onMutate(applyMembers);
        ctx.cleanup(() => {
            document.querySelectorAll("[data-omniyap-original]").forEach((node) => {
                node.textContent = node.dataset.omniyapOriginal;
                delete node.dataset.omniyapOriginal;
            });
        });
        ctx.css(`[data-omniyap-action="Nickname"]{font-size:13px;width:26px;height:26px;padding:0}`);
        applyMembers();
    },
});
