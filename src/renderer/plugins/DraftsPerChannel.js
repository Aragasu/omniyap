import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { getComposer, setNativeValue, localJson, h } from "./_shared.js";
import ui from "../ui/settings.js";
import { openModal } from "../ui/modal.js";

const drafts = localJson("drafts", {});

const settings = definePluginSettings({
    badges: { type: OptionType.BOOLEAN, description: "Show a dot on channels that have an unsent draft.", default: true },
    keepOnSend: { type: OptionType.BOOLEAN, description: "Keep the draft text after sending (it is cleared by default).", default: false },
});

function map() {
    const value = drafts.read();
    return value && typeof value === "object" ? value : {};
}

export default definePlugin({
    name: "DraftsPerChannel",
    description: "Saves what you have typed in every channel and restores it when you come back, with a dot on channels that have a draft.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let lastChannelId = store.activeChannelId();
        let lastValue = "";
        let saveTimer = null;
        let restoreTimer = null;

        const badge = () => {
            if (!settings.store.badges) {
                document.querySelectorAll(".omniyap-draft-dot").forEach((node) => node.remove());
                return;
            }
            const saved = map();
            document.querySelectorAll(".channel-row[data-nav-chan]").forEach((row) => {
                const id = row.getAttribute("data-nav-chan");
                row.classList.toggle("omniyap-has-draft", !!saved[id]);
            });
        };

        const save = (channelId = lastChannelId, value = lastValue) => {
            if (!channelId) return;
            const saved = map();
            if (value && value.trim()) saved[channelId] = value;
            else delete saved[channelId];
            drafts.write(saved);
            badge();
        };

        const onInput = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            lastValue = composer.value;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => save(), 400);
        };

        const switchDraft = (channelId) => {
            clearTimeout(restoreTimer);
            const wanted = map()[channelId] || "";
            lastValue = wanted;
            restoreTimer = setTimeout(() => {
                const composer = getComposer();
                if (!composer) return;
                if (!composer.value && wanted) {
                    setNativeValue(composer, wanted);
                    composer.setSelectionRange?.(wanted.length, wanted.length);
                }
            }, 160);
        };

        // A sent message clears the composer, which clears the draft.
        ctx.on("store:change", (state, previous) => {
            if (state.activeChannelId === previous.activeChannelId) return;
            save(lastChannelId, lastValue);
            lastChannelId = state.activeChannelId;
            switchDraft(state.activeChannelId);
        });

        document.addEventListener("input", onInput, true);
        ctx.onMutate(badge);
        ctx.interval(() => {
            const composer = getComposer();
            if (!composer || !lastChannelId) return;
            if (!composer.value && map()[lastChannelId] && !settings.store.keepOnSend) save(lastChannelId, "");
        }, 1200);

        ctx.cleanup(() => {
            save();
            document.removeEventListener("input", onInput, true);
            clearTimeout(saveTimer);
            clearTimeout(restoreTimer);
        });
        ctx.cleanup(() => document.querySelectorAll(".omniyap-has-draft").forEach((row) => row.classList.remove("omniyap-has-draft")));

        ctx.css(`
            .channel-row.omniyap-has-draft > .channel-main .name::after{content:"•";color:#b57bff;margin-left:5px;font-weight:900}
            .channel-row.omniyap-has-draft:not(.active) > .channel-main .name{font-style:italic}
        `);

        ctx.cleanup(ui.registerTool({
            id: "drafts",
            label: "Channel drafts",
            icon: "✎",
            description: "See and clear unsent drafts.",
            onClick() {
                const render = (body) => {
                    const entries = Object.entries(map());
                    if (!entries.length) {
                        body.replaceChildren(h("div", { class: "omniyap-empty" }, "No drafts. Type something and switch channels."));
                        return;
                    }
                    body.replaceChildren(...entries.map(([id, text]) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label", style: { minWidth: 0 } },
                            h("b", {}, store.channelName(id) || (store.channel(id) ? "Direct message" : "Deleted channel")),
                            h("span", { style: { whiteSpace: "pre-wrap", maxHeight: "60px", overflow: "hidden" } }, text.slice(0, 180)),
                        ),
                        h("button", {
                            class: "omniyap-btn",
                            onclick: (event) => {
                                save(id, "");
                                document.querySelectorAll(".channel-row[data-nav-chan]").forEach((row) => {
                                    if (row.getAttribute("data-nav-chan") === id) row.classList.remove("omniyap-has-draft");
                                });
                                render(event.currentTarget.closest(".omniyap-modal-body"));
                            },
                        }, "Clear"),
                    )));
                };
                openModal({ title: "Channel drafts", subtitle: "Stored on this device only", width: 620, body: h("div"), onMount: render });
            },
        }));

        const current = getComposer();
        if (current) lastValue = current.value;
        badge();
    },
});
