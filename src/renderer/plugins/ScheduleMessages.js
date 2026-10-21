import { definePlugin, store } from "../core/api.js";
import { h, localJson, sendMessage, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const queue = localJson("scheduled", []);

function scheduleAt(time, channelId, text) {
    const items = queue.read();
    items.push({ id: Math.random().toString(36).slice(2), at: time, channelId, text });
    queue.write(items);
}

export default definePlugin({
    name: "ScheduleMessages",
    description: "Write a message now and have OmniYap send it later.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "productivity"],

    start(ctx) {
        const sendDialog = () => {
            const composer = document.querySelector(".composer textarea");
            const text = composer?.value?.trim() || "";
            const channelId = store.activeChannelId();
            if (!channelId) return ctx.toast("Open a channel first", { type: "error" });

            const textArea = h("textarea", { class: "omniyap-css", style: { minHeight: "100px" } }, text);
            const delay = h("select", { class: "omniyap-search" },
                h("option", { value: "60" }, "In 1 minute"),
                h("option", { value: "300" }, "In 5 minutes"),
                h("option", { value: "1800" }, "In 30 minutes"),
                h("option", { value: "3600" }, "In 1 hour"),
                h("option", { value: "86400" }, "In 24 hours"),
            );
            const custom = h("input", { type: "datetime-local", class: "omniyap-search", style: { width: "100%" } });

            openModal({
                title: "Schedule a message",
                subtitle: `#${store.channelName(channelId)}`,
                width: 520,
                body: h("div", { style: { display: "grid", gap: "10px" } }, textArea, delay, custom),
                actions: [{
                    label: "Schedule",
                    primary: true,
                    onClick: ({ close }) => {
                        const when = custom.value ? new Date(custom.value).getTime() : Date.now() + Number(delay.value) * 1000;
                        if (!when || when <= Date.now()) return ctx.toast("Pick a time in the future", { type: "error" });
                        if (!textArea.value.trim()) return ctx.toast("Write a message first", { type: "error" });
                        scheduleAt(when, channelId, textArea.value);
                        ctx.toast(`Scheduled for ${formatTime(when)}`, { type: "success" });
                        close();
                    },
                }],
            });
        };

        const cancelDialog = () => {
            const items = queue.read();
            if (!items.length) return ctx.toast("Nothing scheduled");
            openModal({
                title: "Scheduled messages",
                width: 620,
                body: h("div", {}, items.map((item) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" },
                        h("b", {}, formatTime(item.at)),
                        h("span", {}, item.text.slice(0, 180)),
                    ),
                    h("button", {
                        class: "omniyap-btn",
                        onclick: () => {
                            queue.write(queue.read().filter((entry) => entry.id !== item.id));
                            ctx.toast("Cancelled");
                        },
                    }, "Cancel"),
                ))),
            });
        };

        const tick = async () => {
            const items = queue.read();
            if (!items.length) return;
            const now = Date.now();
            const due = items.filter((item) => item.at <= now);
            if (!due.length) return;
            queue.write(items.filter((item) => item.at > now));
            for (const item of due) {
                try {
                    if (store.activeChannelId() === item.channelId) {
                        await sendMessage(item.text);
                    } else {
                        store.setState({ activeChannelId: item.channelId });
                        await new Promise((resolve) => setTimeout(resolve, 900));
                        await sendMessage(item.text);
                    }
                    ctx.toast(`Sent scheduled message to #${store.channelName(item.channelId)}`, { type: "success" });
                } catch (err) {
                    ctx.log.error("scheduled send failed", err);
                }
            }
        };

        ctx.interval(tick, 5000);
        ctx.timeout(tick, 1500);

        const onKey = (event) => {
            if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== "s") return;
            event.preventDefault();
            sendDialog();
        };
        document.addEventListener("keydown", onKey, true);

        ctx.cleanup(ui.registerTool({
            id: "schedule",
            label: "Scheduled messages",
            icon: "◷",
            description: "Queue a message and pick a time or delay to send it.",
            onClick: () => sendDialog(),
        }));
        ctx.cleanup(ui.registerTool({
            id: "schedule-manage",
            label: "Manage scheduled messages",
            icon: "☰",
            description: "Review or cancel messages waiting to be sent.",
            onClick: () => cancelDialog(),
        }));

        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
    },
});
