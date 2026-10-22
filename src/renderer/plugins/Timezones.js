import { definePlugin, definePluginSettings, OptionType, store, messages } from "../core/api.js";
import { h, addMessageAction, authorOf, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const zones = localJson("timezones", {});
const COMMON = [
    "UTC", "Europe/London", "Europe/Berlin", "Europe/Paris", "Europe/Warsaw", "Europe/Moscow",
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Sao_Paulo",
    "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai", "Australia/Sydney", "Pacific/Auckland",
];

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Clock format.",
        options: [
            { label: "24-hour", value: "24" },
            { label: "12-hour", value: "12" },
        ],
        default: "24",
    },
    myZone: { type: OptionType.STRING, description: "Your own IANA timezone (for the tool list).", default: "" },
});

function clock(zone) {
    try {
        return new Intl.DateTimeFormat([], {
            timeZone: zone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: settings.store.format === "12",
        }).format(new Date());
    } catch {
        return null;
    }
}

function timezoneDialog(userId, name, onChange) {
    const current = zones.read()[userId] || "";
    const input = h("input", {
        class: "omniyap-search",
        style: { width: "100%" },
        value: current,
        placeholder: "Europe/Berlin",
        list: "omniyap-tz-list",
    });
    const datalist = h("datalist", { id: "omniyap-tz-list" }, ...COMMON.map((zone) => h("option", { value: zone })));
    const hint = h("p", { class: "omniyap-muted" }, "IANA timezone names only. Nothing is sent to anyone; this is a local label.");
    openModal({
        title: name || "Timezone",
        subtitle: "Shown beside this person's messages",
        width: 440,
        body: h("div", {}, input, datalist, hint),
        actions: [
            {
                label: "Clear",
                onClick: ({ close }) => {
                    const all = zones.read();
                    delete all[userId];
                    zones.write(all);
                    onChange?.();
                    close();
                },
            },
            {
                label: "Save",
                primary: true,
                onClick: ({ close }) => {
                    const zone = input.value.trim();
                    if (zone && !clock(zone)) {
                        hint.textContent = `"${zone}" is not a timezone Intl recognises.`;
                        hint.style.color = "#ff9b9b";
                        return;
                    }
                    const all = zones.read();
                    if (zone) all[userId] = zone;
                    else delete all[userId];
                    zones.write(all);
                    onChange?.();
                    messages.refresh();
                    close();
                },
            },
        ],
    });
}

export default definePlugin({
    name: "Timezones",
    description: "Shows the local time of people you have tagged with a timezone, and lets you set one from any message.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "social"],
    settings,

    start(ctx) {
        const decorate = ({ el, message }) => {
            const userId = message?.author_id || message?.user_id;
            if (!userId) return;
            const zone = zones.read()[userId];
            const head = el.querySelector(".msg-head");
            if (!head) return;
            const existing = head.querySelector(`.omniyap-tz[data-user="${CSS.escape(userId)}"]`);
            if (!zone) {
                existing?.remove();
                return;
            }
            const time = clock(zone);
            if (!time) return;
            const badge = existing || h("span", { class: "omniyap-tz" });
            badge.dataset.user = userId;
            badge.textContent = `${time} · ${zone.split("/").pop().replace(/_/g, " ")}`;
            badge.title = `${store.displayName(userId)}'s local time (${zone})`;
            if (!existing) head.appendChild(badge);
        };

        const action = ({ el, message }) => {
            if (el.querySelector('[data-omniyap-action="Timezone"]')) return;
            const author = authorOf(el);
            const userId = message?.author_id || message?.user_id || author.id;
            if (!userId) return;
            addMessageAction(el, {
                label: "Timezone",
                title: "Set this person's timezone",
                html: "◷",
                onClick: () => timezoneDialog(userId, author.name || store.displayName(userId)),
            });
        };

        const openList = () => {
            const entries = Object.entries(zones.read());
            const mine = settings.store.myZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            openModal({
                title: "Timezones",
                subtitle: mine ? `You: ${mine} · ${clock(mine) || "unknown"}` : "No timezone saved for you",
                width: 560,
                body: entries.length ? h("div", {}, ...entries.map(([userId, zone]) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" }, h("b", {}, store.displayName(userId) || userId), h("span", {}, zone)),
                    h("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
                        h("span", { class: "omniyap-tz" }, clock(zone) || "—"),
                        h("button", { class: "omniyap-btn", onclick: () => timezoneDialog(userId, store.displayName(userId), openList) }, "Edit"),
                    ),
                ))) : h("div", { class: "omniyap-empty" }, "No timezones saved yet. Use the ◷ action on a message."),
            });
        };

        ctx.cleanup(messages.decorate((info) => {
            decorate(info);
            action(info);
        }));
        ctx.interval(() => {
            document.querySelectorAll(".omniyap-tz[data-user]").forEach((badge) => {
                const zone = zones.read()[badge.dataset.user];
                if (!zone) return badge.remove();
                const time = clock(zone);
                if (time) badge.textContent = `${time} · ${zone.split("/").pop().replace(/_/g, " ")}`;
            });
        }, 30_000);
        ctx.cleanup(ui.registerTool({
            id: "timezones",
            label: "Timezones",
            icon: "◷",
            description: "Local times for people you follow.",
            onClick: openList,
        }));
        ctx.cleanup(settings.onChange(() => messages.refresh()));
        ctx.css(`
            .omniyap-tz{margin-left:6px;padding:0 6px;border-radius:999px;border:1px solid rgba(255,255,255,.09);
                background:rgba(255,255,255,.045);color:#8f93a3;font:500 9.5px ui-monospace,SFMono-Regular,Menlo,monospace;
                vertical-align:1px;white-space:nowrap}
            [data-omniyap-action="Timezone"]{font-size:12px;width:26px;height:26px;padding:0}
        `);
    },
});
