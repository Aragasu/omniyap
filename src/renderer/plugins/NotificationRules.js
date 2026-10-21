import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const settings = definePluginSettings({
    muteKeywords: {
        type: OptionType.STRING,
        description: "Do not notify when a message contains any of these (comma separated).",
        default: "",
    },
    onlyKeywords: {
        type: OptionType.STRING,
        description: "If set, only notify when a message contains one of these.",
        default: "",
    },
    muteChannels: {
        type: OptionType.STRING,
        description: "Channel names that should never notify (comma separated).",
        default: "",
    },
});

const split = (value) => String(value || "").split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);

function shouldNotify(text) {
    const lower = String(text || "").toLowerCase();
    const mute = split(settings.store.muteKeywords);
    if (mute.some((word) => lower.includes(word))) return false;
    const only = split(settings.store.onlyKeywords);
    if (only.length && !only.some((word) => lower.includes(word))) return false;
    const channels = split(settings.store.muteChannels);
    const activeName = store.channelName(store.activeChannelId()).toLowerCase();
    if (channels.includes(activeName)) return false;
    return true;
}

export default definePlugin({
    name: "NotificationRules",
    description: "Filter desktop notifications by keyword or channel.",
    authors: [{ name: "OmniYap" }],
    tags: ["notifications", "utility"],
    settings,

    start(ctx) {
        const NativeNotification = window.Notification;
        if (!NativeNotification) return;

        let suppressed = 0;

        class FilteredNotification extends NativeNotification {
            constructor(title, options) {
                const body = `${title || ""} ${options?.body || ""}`;
                if (!shouldNotify(body)) {
                    suppressed++;
                    // A Notification instance is expected by callers; keep it silent and inert.
                    super(title, { ...options, silent: true });
                    this.close();
                    return;
                }
                super(title, options);
            }

            static requestPermission(...args) {
                return NativeNotification.requestPermission(...args);
            }

            static get permission() {
                return NativeNotification.permission;
            }
        }

        try {
            Object.defineProperty(window, "Notification", { configurable: true, writable: true, value: FilteredNotification });
        } catch (err) {
            ctx.log.error("could not wrap Notification", err);
        }

        const show = () => {
            openModal({
                title: "Notification rules",
                subtitle: "Filters apply to Yapper's desktop notifications",
                width: 560,
                body: h("div", {},
                    h("p", { class: "omniyap-muted" }, "Edit the rules in the plugin settings. Notifications are filtered as they are created."),
                    h("div", { class: "omniyap-pre" },
                        `Muted keywords: ${settings.store.muteKeywords || "(none)"}\n` +
                        `Only keywords: ${settings.store.onlyKeywords || "(none)"}\n` +
                        `Muted channels: ${settings.store.muteChannels || "(none)"}\n` +
                        `Suppressed this session: ${suppressed}`),
                ),
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "notification-rules",
            label: "Notification rules",
            icon: "◔",
            description: "See how many notifications were filtered and which rules are active.",
            onClick: show,
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
