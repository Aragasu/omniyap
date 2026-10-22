import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { formatDuration } from "./_shared.js";

const settings = definePluginSettings({
    icon: { type: OptionType.BOOLEAN, description: "Put a phone icon before the time.", default: true },
});

const channelOf = (state) => state?.voice?.channelId || state?.voiceChannelId || null;

export default definePlugin({
    name: "CallTitleTimer",
    description: "Puts the call duration in the window and taskbar title while you are in voice, so it is visible when the app is minimised.",
    authors: [{ name: "OmniYap" }],
    tags: ["voice", "utility"],
    settings,

    start(ctx) {
        const original = document.title;
        let startedAt = 0;
        let active = false;

        const render = () => {
            const inCall = !!(channelOf(store.getState()));
            if (inCall && !active) {
                active = true;
                startedAt = Date.now();
            } else if (!inCall && active) {
                active = false;
                document.title = original;
                return;
            }
            if (!active) return;
            const prefix = settings.store.icon ? "📞 " : "";
            document.title = `${prefix}${formatDuration(Date.now() - startedAt)} · ${store.channelName(channelOf(store.getState())) || "Call"}`;
        };

        ctx.on("store:change", (state, previous) => {
            if (channelOf(state) !== channelOf(previous)) render();
        });
        ctx.interval(render, 1000);
        ctx.cleanup(settings.onChange(render));
        ctx.cleanup(() => {
            document.title = original;
        });
        render();
    },
});
