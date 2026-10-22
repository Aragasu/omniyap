import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, headerButton, insertIntoComposer } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Default timestamp format.",
        options: [
            { label: "Local date and time", value: "local" },
            { label: "Time only", value: "time" },
            { label: "ISO 8601", value: "iso" },
            { label: "UTC", value: "utc" },
            { label: "Relative (in 2 hours)", value: "relative" },
            { label: "Discord timestamp (<t:…>)", value: "discord" },
        ],
        default: "local",
    },
    shortcut: { type: OptionType.BOOLEAN, description: "Ctrl+Shift+T inserts the timestamp immediately.", default: true },
});

function stamp(format, date = new Date()) {
    if (format === "time") return date.toLocaleTimeString();
    if (format === "iso") return date.toISOString();
    if (format === "utc") return date.toUTCString();
    if (format === "discord") return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
    if (format === "relative") {
        const minutes = Math.round((date.getTime() - Date.now()) / 60000);
        if (Math.abs(minutes) < 1) return "now";
        return minutes > 0 ? `in ${minutes} min` : `${Math.abs(minutes)} min ago`;
    }
    return date.toLocaleString();
}

export default definePlugin({
    name: "SendTimestamps",
    description: "Puts the current time, an ISO timestamp or a Discord timestamp into the composer.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const insert = (format) => {
            const text = stamp(format);
            if (insertIntoComposer(text)) ctx.toast(`Inserted ${text}`, { type: "success" });
            else ctx.toast("Open a channel and try again", { type: "error" });
        };

        const open = () => {
            const formats = ["local", "time", "iso", "utc", "relative", "discord"];
            const labels = {
                local: "Local date and time",
                time: "Time only",
                iso: "ISO 8601",
                utc: "UTC",
                relative: "Relative",
                discord: "Discord timestamp",
            };
            openModal({
                title: "Insert timestamp",
                subtitle: "Goes into the composer at the caret",
                width: 460,
                body: h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    ...formats.map((format) => h("button", {
                        class: "omniyap-btn",
                        style: { textAlign: "left", display: "flex", justifyContent: "space-between" },
                        onclick: () => {
                            insert(format);
                            document.querySelector(".omniyap-modal-root:not([hidden]) .omniyap-modal-head .icon-btn")?.click();
                        },
                    }, h("span", {}, labels[format]), h("span", { class: "omniyap-muted" }, stamp(format)))),
                ),
            });
        };

        const onKey = (event) => {
            if (!settings.store.shortcut || !event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "t") return;
            if (event.target instanceof HTMLElement && event.target.closest("input:not(textarea), select")) return;
            event.preventDefault();
            insert(settings.store.format);
        };

        document.addEventListener("keydown", onKey, true);
        ctx.watch("header.main-head", () => headerButton({
            className: "omniyap-stamp-btn",
            title: "Insert a timestamp",
            text: "🕘",
            onClick: open,
        }));
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.querySelector(".omniyap-stamp-btn")?.remove();
        });
        ctx.css(`.omniyap-stamp-btn{font-size:12px;width:26px;height:26px;padding:0;filter:grayscale(.4)}`);
    },
});
