import { definePlugin, definePluginSettings, OptionType, store, events, log } from "../core/api.js";
import { localJson } from "./_shared.js";

const memory = localJson("last-channel", {});

const settings = definePluginSettings({
    scope: {
        type: OptionType.SELECT,
        description: "What to remember.",
        options: [
            { label: "Per server and DMs", value: "all" },
            { label: "Servers only", value: "servers" },
            { label: "One channel for everything", value: "global" },
        ],
        default: "all",
    },
});

function keyFor(state) {
    if (settings.store.scope === "global") return "global";
    const channel = state?.channels?.[state.activeChannelId];
    if (!channel) return null;
    if (channel.server_id) return `server:${channel.server_id}`;
    if (settings.store.scope === "servers") return null;
    return "dms";
}

export default definePlugin({
    name: "KeepCurrentChannel",
    description: "Reopens the channel you were last reading after a reload.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        let restoring = false;

        const remember = (state) => {
            if (!state?.activeChannelId) return;
            const key = keyFor(state);
            if (!key) return;
            const map = memory.read();
            map[key] = state.activeChannelId;
            memory.write(map);
        };

        ctx.on("store:change", (state) => {
            if (restoring) return;
            remember(state);
        });

        const restore = (state) => {
            if (!state || !state.channels) return;
            const key = keyFor(state);
            if (!key) return;
            const target = memory.read()[key];
            if (!target || target === state.activeChannelId) return;
            if (!state.channels[target]) return;
            restoring = true;
            try {
                store.setState({ activeChannelId: target });
                log.info("restored channel", target);
            } catch (err) {
                ctx.log.warn("could not restore the channel", err);
            }
            setTimeout(() => (restoring = false), 350);
        };

        // Restore once the store has data and the app is idle; Yapper sets its own default first.
        ctx.on("store:ready", () => {
            setTimeout(() => restore(store.getState()), 700);
        });
        setTimeout(() => restore(store.getState()), 2500);
    },
});
