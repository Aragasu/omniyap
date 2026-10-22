import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    showEmpty: { type: OptionType.BOOLEAN, description: "Also show a note when a voice channel is empty.", default: true },
});

const memberId = (member) => member?.userId || member?.user_id || member?.id || member;

function voiceChannelId(row) {
    const id = row?.getAttribute("data-nav-chan");
    if (!id) return null;
    const channel = store.channel(id);
    if (!channel) return null;
    const type = String(channel.type || channel.kind || "").toLowerCase();
    if (type.includes("voice") || type.includes("call") || row.classList.contains("voice") || row.querySelector(".channel-glyph.voice")) return id;
    return null;
}

export default definePlugin({
    name: "VoicePeek",
    description: "Hover a voice channel to see who is inside it, without joining or opening anything.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "utility"],
    settings,

    start(ctx) {
        let pop = null;
        let hideTimer = null;

        const hide = () => {
            clearTimeout(hideTimer);
            pop?.remove();
            pop = null;
        };

        const show = (row, channelId) => {
            clearTimeout(hideTimer);
            const users = (store.getState()?.voiceMembers?.[channelId] || []).map(memberId).filter(Boolean);
            if (!users.length && !settings.store.showEmpty) return hide();
            const rect = row.getBoundingClientRect();
            pop?.remove();
            pop = h("div", { class: "omniyap-vc-peek" },
                h("div", { class: "omniyap-vc-peek-head" }, `🔊 ${store.channelName(channelId) || "Voice"} · ${users.length}`),
                ...users.slice(0, 12).map((id) => h("div", { class: "omniyap-vc-peek-row" },
                    h("span", { class: "omniyap-vc-peek-dot" }),
                    h("span", { class: "omniyap-vc-peek-name" }, store.displayName(id)),
                )),
                users.length > 12 ? h("div", { class: "omniyap-vc-peek-more" }, `and ${users.length - 12} more`) : null,
                !users.length ? h("div", { class: "omniyap-vc-peek-empty" }, "Nobody is connected.") : null,
            );
            pop.style.left = `${Math.min(window.innerWidth - 230, rect.right + 8)}px`;
            pop.style.top = `${Math.max(8, Math.min(window.innerHeight - 180, rect.top))}px`;
            document.body.appendChild(pop);
            pop.addEventListener("mouseenter", () => clearTimeout(hideTimer));
            pop.addEventListener("mouseleave", hide);
        };

        const onOver = (event) => {
            if (!(event.target instanceof Element)) return;
            const row = event.target.closest(".channel-row[data-nav-chan]");
            if (!row) return;
            const id = voiceChannelId(row);
            if (id) show(row, id);
        };

        const onOut = (event) => {
            if (!(event.target instanceof Element)) return;
            const row = event.target.closest(".channel-row[data-nav-chan]");
            if (!row || row.contains(event.relatedTarget)) return;
            hideTimer = setTimeout(hide, 140);
        };

        document.addEventListener("mouseover", onOver);
        document.addEventListener("mouseout", onOut);
        window.addEventListener("scroll", hide, true);
        ctx.cleanup(() => {
            document.removeEventListener("mouseover", onOver);
            document.removeEventListener("mouseout", onOut);
            window.removeEventListener("scroll", hide, true);
            hide();
        });
        ctx.css(`
            .omniyap-vc-peek{position:fixed;z-index:2147483000;width:216px;background:#1b1b26;border:1px solid rgba(255,255,255,.1);
                border-radius:9px;box-shadow:0 10px 34px rgba(0,0,0,.5);padding:8px;color:#e4e5ea}
            .omniyap-vc-peek-head{font:700 11px Inter,system-ui,sans-serif;color:#c3c5cd;padding:1px 3px 6px;
                border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:4px}
            .omniyap-vc-peek-row{display:flex;align-items:center;gap:7px;padding:3px 3px;font:500 11.5px Inter,system-ui,sans-serif}
            .omniyap-vc-peek-dot{width:6px;height:6px;border-radius:50%;background:#3ba55d;flex:none}
            .omniyap-vc-peek-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .omniyap-vc-peek-empty,.omniyap-vc-peek-more{font:500 10.5px Inter,system-ui,sans-serif;color:#858895;padding:3px}
        `);
    },
});
