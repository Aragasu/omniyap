import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, headerButton, localJson } from "./_shared.js";

const forced = localJson("nsfw-channels", []);

const settings = definePluginSettings({
    blur: { type: OptionType.SLIDER, description: "Blur strength in pixels.", default: 18, min: 4, max: 40, step: 2 },
    auto: { type: OptionType.BOOLEAN, description: "Blur automatically in channels marked NSFW.", default: true },
    revealOnClick: { type: OptionType.BOOLEAN, description: "Click blurred media to reveal it.", default: true },
});

function channelIsNsfw(channelId) {
    const channel = store.channel(channelId);
    return !!(settings.store.auto && (channel?.nsfw || channel?.is_nsfw || channel?.age_restricted))
        || forced.read().includes(channelId);
}

export default definePlugin({
    name: "BlurNsfw",
    description: "Blurs images and video in NSFW channels until you click them, with a per-channel toggle.",
    authors: [{ name: "OmniYap" }],
    tags: ["media", "privacy", "appearance"],
    settings,

    start(ctx) {
        let revealed = new WeakSet();

        const apply = () => {
            const channelId = store.activeChannelId();
            const blur = channelIsNsfw(channelId);
            document.querySelectorAll(".msg[data-message-id]").forEach((row) => {
                const media = row.querySelectorAll(".msg-image, .msg-body img, .msg-body video");
                media.forEach((element) => {
                    if (element.closest(".avatar") || element.classList.contains("emoji")) return;
                    element.classList.toggle("omniyap-nsfw-media", blur && !revealed.has(element));
                });
                row.querySelectorAll(".omniyap-nsfw-note").forEach((note) => note.remove());
                if (blur) {
                    const first = row.querySelector(".msg-image");
                    if (first && !first.querySelector(".omniyap-nsfw-note")) {
                        first.appendChild(h("span", { class: "omniyap-nsfw-note" }, "NSFW · click to reveal"));
                    }
                }
            });
            const button = document.querySelector(".omniyap-nsfw-btn");
            if (button) {
                button.classList.toggle("on", blur);
                button.title = blur ? "Show NSFW media in this channel" : "Blur NSFW media in this channel";
            }
        };

        const toggle = () => {
            const channelId = store.activeChannelId();
            if (!channelId) return;
            const list = forced.read();
            forced.write(list.includes(channelId) ? list.filter((id) => id !== channelId) : [...list, channelId]);
            revealed = new WeakSet();
            apply();
            ctx.toast(forced.read().includes(channelId) ? "Media blurred here" : "Media unblurred here");
        };

        const onClick = (event) => {
            if (!settings.store.revealOnClick) return;
            const media = event.target instanceof Element ? event.target.closest(".omniyap-nsfw-media") : null;
            if (!media) return;
            event.preventDefault();
            event.stopPropagation();
            revealed.add(media);
            media.classList.remove("omniyap-nsfw-media");
        };

        const mountButton = () => {
            if (!channelIsNsfw(store.activeChannelId()) && !forced.read().includes(store.activeChannelId())) {
                document.querySelector(".omniyap-nsfw-btn")?.remove();
                return;
            }
            headerButton({
                className: "omniyap-nsfw-btn",
                title: "Blur NSFW media in this channel",
                text: "18+",
                onClick: toggle,
            });
        };

        ctx.watch("header.main-head", mountButton);
        ctx.onMutate(apply);
        ctx.on("store:change", () => {
            mountButton();
            apply();
        });
        document.addEventListener("click", onClick, true);
        ctx.css(`
            .omniyap-nsfw-media{filter:blur(${settings.store.blur}px) saturate(.7)!important;cursor:pointer;transition:filter .18s}
            .omniyap-nsfw-note{position:absolute;left:8px;bottom:8px;padding:2px 8px;border-radius:999px;
                background:rgba(10,10,16,.8);border:1px solid rgba(255,255,255,.16);color:#d6d7de;
                font:600 10px Inter,system-ui,sans-serif;pointer-events:none}
            .msg-image{position:relative}
            .omniyap-nsfw-btn{font:700 10px Inter,system-ui,sans-serif;width:28px;height:26px;padding:0}
            .omniyap-nsfw-btn.on{color:#ff9b9b;border-color:rgba(229,72,77,.5)}
        `);
        ctx.cleanup(settings.onChange((key) => {
            if (key !== "blur") return;
            ctx.css(`
                .omniyap-nsfw-media{filter:blur(${settings.store.blur}px) saturate(.7)!important;cursor:pointer;transition:filter .18s}
                .omniyap-nsfw-note{position:absolute;left:8px;bottom:8px;padding:2px 8px;border-radius:999px;
                    background:rgba(10,10,16,.8);border:1px solid rgba(255,255,255,.16);color:#d6d7de;
                    font:600 10px Inter,system-ui,sans-serif;pointer-events:none}
                .msg-image{position:relative}
                .omniyap-nsfw-btn{font:700 10px Inter,system-ui,sans-serif;width:28px;height:26px;padding:0}
                .omniyap-nsfw-btn.on{color:#ff9b9b;border-color:rgba(229,72,77,.5)}
            `);
        }));
        ctx.cleanup(() => {
            document.removeEventListener("click", onClick, true);
            document.querySelectorAll(".omniyap-nsfw-media").forEach((element) => element.classList.remove("omniyap-nsfw-media"));
            document.querySelectorAll(".omniyap-nsfw-note").forEach((note) => note.remove());
            document.querySelector(".omniyap-nsfw-btn")?.remove();
        });
        mountButton();
        apply();
    },
});
