import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h, headerButton } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    showLegend: { type: OptionType.BOOLEAN, description: "Add a legend button to the chat header.", default: true },
    onMessages: { type: OptionType.BOOLEAN, description: "Mark presence on message avatars too.", default: true },
});

const LABELS = {
    online: "Online",
    idle: "Idle",
    dnd: "Do not disturb",
    offline: "Offline",
    invisible: "Invisible",
};

export default definePlugin({
    name: "ColorSighted",
    description: "Adds shape- and letter-coded presence badges so status is readable without relying on colour.",
    authors: [{ name: "OmniYap" }],
    tags: ["accessibility", "appearance"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const avatar = el.querySelector(".avatar");
            if (!avatar) return;
            const userId = message?.author_id || message?.user_id;
            if (settings.store.onMessages && userId) {
                const status = store.online(userId) || "offline";
                avatar.dataset.omniyapPresence = status;
                avatar.title = `${store.displayName(userId)} · ${LABELS[status] || status}`;
            }
        };

        const legend = () => {
            openModal({
                title: "Presence legend",
                subtitle: "Shape and initial, not just colour",
                width: 420,
                body: h("div", {},
                    ...Object.entries(LABELS).map(([status, label]) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" }, h("b", {}, label), h("span", {}, status)),
                        h("span", { class: `omniyap-presence-chip ${status}` }, status === "online" ? "●" : status === "idle" ? "◐" : status === "dnd" ? "⊘" : "○"),
                    )),
                    h("p", { class: "omniyap-muted" }, "Badges also carry a letter in the avatar corner when the avatar is visible."),
                ),
            });
        };

        const mount = () => {
            if (!settings.store.showLegend) return;
            headerButton({ className: "omniyap-presence-btn", title: "Presence legend", text: "◐", onClick: legend });
        };

        ctx.cleanup(messages.decorate(decorate));
        ctx.watch("header.main-head", mount);
        ctx.cleanup(settings.onChange(() => messages.refresh()));
        ctx.css(`
            .avatar[data-omniyap-presence]::after{position:absolute;right:-1px;bottom:-1px;display:grid;place-items:center;
                width:11px;height:11px;border-radius:50%;font:700 7px Inter,system-ui,sans-serif;color:#0b0b10;
                border:2px solid #15151f;box-sizing:content-box}
            .avatar[data-omniyap-presence="online"]::after{content:"●";background:#30a46c;color:#eafff2}
            .avatar[data-omniyap-presence="idle"]::after{content:"◐";background:#f5a524;color:#2b1d00}
            .avatar[data-omniyap-presence="dnd"]::after{content:"⊘";background:#e5484d;color:#fff}
            .avatar[data-omniyap-presence="offline"]::after{content:"○";background:#4a4b57;color:#c9cbd4}
            .avatar[data-omniyap-presence="invisible"]::after{content:"○";background:#4a4b57;color:#c9cbd4}
            .omniyap-presence-btn{font-size:13px;width:26px;height:26px;padding:0}
            .omniyap-presence-chip{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:12px;font-weight:800}
            .omniyap-presence-chip.online{background:#30a46c;color:#eafff2}
            .omniyap-presence-chip.idle{background:#f5a524;color:#2b1d00}
            .omniyap-presence-chip.dnd{background:#e5484d;color:#fff}
            .omniyap-presence-chip.offline{background:#4a4b57;color:#c9cbd4}
        `);
        mount();
    },
});
