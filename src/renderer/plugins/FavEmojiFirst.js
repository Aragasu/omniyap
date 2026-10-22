import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, localJson, insertIntoComposer, parseList } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const favourites = localJson("favourite-emoji", ["😂", "🔥", "❤️", "👍", "👀", "🎉", "😭", "💀"]);

const settings = definePluginSettings({
    showBar: { type: OptionType.BOOLEAN, description: "Show the favourites bar above the composer.", default: true },
    emoji: { type: OptionType.STRING, description: "Space-separated favourites (the bar updates immediately).", default: "😂 🔥 ❤️ 👍 👀 🎉 😭 💀", multiline: true },
});

function list() {
    const fromSetting = parseList(String(settings.store.emoji || "").replace(/\s+/g, ","), 40);
    return fromSetting.length ? fromSetting : favourites.read();
}

export default definePlugin({
    name: "FavEmojiFirst",
    description: "Puts your favourite emoji in a one-click bar above the composer instead of buried in the picker.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "appearance"],
    settings,

    start(ctx) {
        let bar = null;

        const mount = () => {
            const composer = document.querySelector(".composer, .composer-box");
            if (!composer) return;
            if (!settings.store.showBar) {
                bar?.remove();
                bar = null;
                return;
            }
            if (bar?.isConnected && bar.nextElementSibling === composer) return;
            bar?.remove();
            bar = h("div", { class: "omniyap-emoji-bar", role: "toolbar", "aria-label": "Favourite emoji" },
                ...list().map((emoji) => h("button", {
                    class: "omniyap-emoji-btn",
                    title: `Insert ${emoji}`,
                    onclick: () => {
                        insertIntoComposer(`${emoji} `);
                    },
                }, emoji)),
                h("button", {
                    class: "omniyap-emoji-edit",
                    title: "Edit favourites",
                    onclick: () => edit(),
                }, "＋"),
            );
            composer.parentElement?.insertBefore(bar, composer);
        };

        const edit = () => {
            const input = h("input", { class: "omniyap-search", style: { width: "100%" }, value: list().join(" ") });
            openModal({
                title: "Favourite emoji",
                subtitle: "Space separated — shown above the composer",
                width: 480,
                body: h("div", {},
                    h("p", { class: "omniyap-muted" }, "These are local shortcuts. They do not change Yapper's own picker."),
                    input,
                ),
                actions: [{
                    label: "Save",
                    primary: true,
                    onClick: ({ close }) => {
                        settings.store.emoji = input.value;
                        mount();
                        close();
                        ctx.toast("Favourites updated", { type: "success" });
                    },
                }],
            });
        };

        ctx.onMutate(mount);
        ctx.on("store:change", mount);
        ctx.cleanup(settings.onChange(mount));
        ctx.cleanup(() => bar?.remove());
        ctx.css(`
            .omniyap-emoji-bar{display:flex;align-items:center;gap:2px;padding:3px 8px;flex-wrap:wrap;
                border-top:1px solid rgba(255,255,255,.05);background:rgba(21,21,31,.6)}
            .omniyap-emoji-btn{width:28px;height:24px;border:0;border-radius:6px;background:transparent;cursor:pointer;font-size:15px;line-height:1}
            .omniyap-emoji-btn:hover{background:rgba(139,57,253,.18)}
            .omniyap-emoji-edit{width:24px;height:22px;border:1px dashed rgba(255,255,255,.16);border-radius:6px;
                background:transparent;color:#8b8d98;font:600 11px Inter,system-ui,sans-serif;cursor:pointer;margin-left:2px}
            .omniyap-emoji-edit:hover{color:#d9c2ff;border-color:rgba(139,57,253,.5)}
        `);
        mount();
    },
});
