import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";

const settings = definePluginSettings({
    lowOnly: { type: OptionType.BOOLEAN, description: "Only show the badge below 25%.", default: false },
});

export default definePlugin({
    name: "BatteryBadge",
    description: "Shows your laptop battery level and charging state in the user bar, with a warning colour when it gets low.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "appearance"],
    settings,

    start(ctx) {
        let badge = null;
        let manager = null;

        const ensure = () => {
            const bar = document.querySelector(".user-bar");
            if (!bar) return null;
            if (!badge || !badge.isConnected) {
                badge = h("span", { class: "omniyap-battery", title: "Battery" });
                const settingsButton = [...bar.querySelectorAll("button")].find((button) => /settings/i.test(button.getAttribute("aria-label") || button.title || ""));
                if (settingsButton) settingsButton.before(badge);
                else bar.appendChild(badge);
            }
            return badge;
        };

        const update = () => {
            const level = Math.round((manager?.level ?? 1) * 100);
            const charging = !!manager?.charging;
            const visible = manager && (!settings.store.lowOnly || level <= 25);
            const node = ensure();
            if (!node) return;
            if (node.hidden !== !visible) node.hidden = !visible;
            if (!visible) return;
            const label = `${charging ? "⚡" : "🔋"} ${level}%`;
            if (node.textContent !== label) node.textContent = label;
            const low = level <= 15 && !charging;
            if (node.classList.contains("low") !== low) node.classList.toggle("low", low);
            const title = charging ? `Charging · ${level}%` : `Battery · ${level}%`;
            if (node.title !== title) node.title = title;
        };

        if (navigator.getBattery) {
            navigator.getBattery().then((battery) => {
                manager = battery;
                const handler = () => update();
                battery.addEventListener("levelchange", handler);
                battery.addEventListener("chargingchange", handler);
                ctx.cleanup(() => {
                    battery.removeEventListener("levelchange", handler);
                    battery.removeEventListener("chargingchange", handler);
                });
                ctx.onMutate(update);
                ctx.cleanup(settings.onChange(update));
                update();
            }).catch(() => ctx.log.warn("battery API unavailable"));
        } else {
            ctx.log.warn("battery API unavailable");
        }

        ctx.cleanup(() => badge?.remove());
        ctx.css(`
            .omniyap-battery{font:600 9.5px ui-monospace,monospace;color:#9a9ca8;background:rgba(255,255,255,.04);
                border:1px solid rgba(255,255,255,.07);border-radius:5px;padding:2px 5px;margin-right:4px;
                white-space:nowrap;user-select:none}
            .omniyap-battery.low{color:#ff9b9b;border-color:rgba(229,72,77,.4);background:rgba(229,72,77,.1)}
            .omniyap-battery[hidden]{display:none}
        `);
    },
});
