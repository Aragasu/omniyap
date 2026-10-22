import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    cooldown: { type: OptionType.SLIDER, description: "Ignore repeat pings from the same DM for this many seconds.", default: 60, min: 5, max: 600, step: 5 },
    sameText: { type: OptionType.BOOLEAN, description: "Also collapse notifications with identical text.", default: true },
});

export default definePlugin({
    name: "OnePingPerDM",
    description: "Stops a busy DM from firing a new notification for every single message.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "chat", "utility"],
    settings,

    start(ctx) {
        const NativeNotification = window.Notification;
        if (!NativeNotification) return;

        const lastByChannel = new Map();
        const lastByText = new Map();
        let suppressed = 0;

        const shouldShow = (title, body) => {
            const channelId = store.activeChannelId() || "unknown";
            const now = Date.now();
            const previous = lastByChannel.get(channelId) || 0;
            if (now - previous < Number(settings.store.cooldown) * 1000) {
                suppressed++;
                return false;
            }
            if (settings.store.sameText) {
                const text = `${title} ${body}`.trim();
                const previousText = lastByText.get(text) || 0;
                if (now - previousText < Number(settings.store.cooldown) * 1000) {
                    suppressed++;
                    return false;
                }
                lastByText.set(text, now);
            }
            lastByChannel.set(channelId, now);
            return true;
        };

        class DedupedNotification extends NativeNotification {
            constructor(title, options) {
                if (shouldShow(title, options?.body || "")) super(title, options);
                else super(title, { ...options, silent: true });
            }
            static requestPermission(...args) {
                return NativeNotification.requestPermission(...args);
            }
            static get permission() {
                return NativeNotification.permission;
            }
        }

        try {
            Object.defineProperty(window, "Notification", { configurable: true, writable: true, value: DedupedNotification });
        } catch (err) {
            ctx.log.warn("could not wrap Notification", err);
        }

        const open = () => {
            openModal({
                title: "One ping per DM",
                subtitle: `${suppressed} repeat notifications suppressed this session`,
                width: 460,
                body: h("div", {},
                    h("p", { class: "omniyap-muted" }, "The first message in a DM still notifies you. Follow-ups within the cooldown stay quiet until you open the conversation."),
                    h("div", { class: "omniyap-row" },
                        h("div", { class: "label" }, h("b", {}, "Cooldown"), h("span", {}, "seconds per conversation")),
                        h("b", {}, String(settings.store.cooldown)),
                    ),
                ),
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "one-ping-per-dm",
            label: "One ping per DM",
            icon: "◔",
            description: "See how many repeat DM notifications were suppressed.",
            onClick: open,
        }));

        ctx.cleanup(() => {
            try {
                window.Notification = NativeNotification;
            } catch {
                /* ignore */
            }
        });
    },
});
