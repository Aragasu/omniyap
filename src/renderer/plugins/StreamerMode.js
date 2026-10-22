import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { headerButton, localJson } from "./_shared.js";

const state = localJson("streamer-mode", { on: false });

const settings = definePluginSettings({
    hideAvatars: { type: OptionType.BOOLEAN, description: "Hide every avatar.", default: true },
    blurNames: { type: OptionType.BOOLEAN, description: "Blur display names and usernames.", default: true },
    blurMedia: { type: OptionType.BOOLEAN, description: "Blur images and video.", default: true },
    hideTimestamps: { type: OptionType.BOOLEAN, description: "Hide message timestamps.", default: false },
});

function apply() {
    const on = !!state.read().on;
    const root = document.documentElement;
    root.toggleAttribute("data-omniyap-streamer", on);
    root.toggleAttribute("data-omniyap-streamer-avatars", on && settings.store.hideAvatars);
    root.toggleAttribute("data-omniyap-streamer-names", on && settings.store.blurNames);
    root.toggleAttribute("data-omniyap-streamer-media", on && settings.store.blurMedia);
    root.toggleAttribute("data-omniyap-streamer-times", on && settings.store.hideTimestamps);
    const button = document.querySelector(".omniyap-streamer-btn");
    if (button) {
        button.classList.toggle("on", on);
        button.textContent = on ? "🙈" : "👁";
        button.title = on ? "Streamer mode is on" : "Enable streamer mode";
    }
}

export default definePlugin({
    name: "StreamerMode",
    description: "One toggle hides avatars, names, timestamps and media so you can share your screen safely.",
    authors: [{ name: "OmniYap" }],
    tags: ["privacy", "appearance", "utility"],
    settings,

    start(ctx) {
        const toggle = () => {
            const current = state.read();
            current.on = !current.on;
            state.write(current);
            apply();
            ctx.toast(current.on ? "Streamer mode on" : "Streamer mode off", { type: current.on ? "success" : "info" });
        };

        const onKey = (event) => {
            if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "e") return;
            event.preventDefault();
            toggle();
        };

        document.addEventListener("keydown", onKey, true);
        ctx.watch("header.main-head", () => headerButton({
            className: "omniyap-streamer-btn",
            title: "Enable streamer mode",
            text: "👁",
            onClick: toggle,
        }));
        ctx.cleanup(settings.onChange(apply));
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.documentElement.removeAttribute("data-omniyap-streamer");
            document.documentElement.removeAttribute("data-omniyap-streamer-avatars");
            document.documentElement.removeAttribute("data-omniyap-streamer-names");
            document.documentElement.removeAttribute("data-omniyap-streamer-media");
            document.documentElement.removeAttribute("data-omniyap-streamer-times");
            document.querySelector(".omniyap-streamer-btn")?.remove();
        });
        ctx.css(`
            [data-omniyap-streamer-avatars] .avatar,
            [data-omniyap-streamer-avatars] .avatar img{visibility:hidden!important}
            [data-omniyap-streamer-names] .msg-author,
            [data-omniyap-streamer-names] .pick-row-name,
            [data-omniyap-streamer-names] .user-bar .name,
            [data-omniyap-streamer-names] .server-head .title,
            [data-omniyap-streamer-names] .main-head .title{filter:blur(5px)!important;user-select:none}
            [data-omniyap-streamer-media] .msg-image img,
            [data-omniyap-streamer-media] .msg-body img,
            [data-omniyap-streamer-media] .msg-body video{filter:blur(12px)!important}
            [data-omniyap-streamer-times] .msg-time,
            [data-omniyap-streamer-times] .omniyap-timestamp,
            [data-omniyap-streamer-times] time{display:none!important}
            .omniyap-streamer-btn{font-size:12px;width:26px;height:26px;padding:0;filter:grayscale(.6)}
            .omniyap-streamer-btn.on{color:#f5c46b;border-color:rgba(245,165,36,.45);filter:none}
        `);
        apply();
    },
});
