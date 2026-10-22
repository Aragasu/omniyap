import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { insertIntoComposer } from "./_shared.js";

const settings = definePluginSettings({
    vimKeys: { type: OptionType.BOOLEAN, description: "Use j/k to move between messages.", default: true },
    copyKey: { type: OptionType.BOOLEAN, description: "Press c to copy the selected message.", default: true },
    replyKey: { type: OptionType.BOOLEAN, description: "Press r to reply to the selected message.", default: true },
});

function rows() {
    return [...document.querySelectorAll(messages.selector)];
}

export default definePlugin({
    name: "KeyboardNavigation",
    description: "Move through messages with j/k, reply with r, copy with c, quote with q and jump to newest with G.",
    authors: [{ name: "OmniYap" }],
    tags: ["navigation", "chat", "accessibility"],
    settings,

    start(ctx) {
        let selected = null;

        const select = (row, scroll = true) => {
            selected?.classList.remove("omniyap-kb-selected");
            selected = row || null;
            if (!selected) return;
            selected.classList.add("omniyap-kb-selected");
            if (scroll) selected.scrollIntoView({ block: "nearest" });
        };

        const currentIndex = () => {
            if (!selected?.isConnected) return -1;
            return rows().indexOf(selected);
        };

        const move = (delta) => {
            const list = rows();
            if (!list.length) return;
            const index = currentIndex();
            const nextIndex = index < 0 ? (delta > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, index + delta));
            select(list[nextIndex]);
        };

        const reply = (row) => {
            const button = row.querySelector('.msg-actions button[aria-label="Reply"], .msg-actions button[title="Reply"]');
            if (button instanceof HTMLElement) {
                button.click();
                return true;
            }
            return false;
        };

        const onKey = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
            const key = event.key;

            if (key === "Escape") {
                select(null);
                return;
            }
            if (key === "j" || key === "k") {
                if (!settings.store.vimKeys) return;
                event.preventDefault();
                move(key === "j" ? 1 : -1);
                return;
            }
            if (key === "G") {
                event.preventDefault();
                const list = rows();
                select(list[list.length - 1]);
                return;
            }
            if (!selected) return;
            const info = messages.info(selected);
            const text = info.textEl?.innerText?.trim() || "";
            if (key === "r" && settings.store.replyKey) {
                if (reply(selected)) event.preventDefault();
            } else if (key === "c" && settings.store.copyKey && text) {
                navigator.clipboard.writeText(text).then(
                    () => ctx.toast("Message copied", { type: "success" }),
                    () => ctx.toast("Could not copy", { type: "error" }),
                );
                event.preventDefault();
            } else if (key === "q" && text) {
                insertIntoComposer(text.split("\n").map((line) => `> ${line}`).join("\n") + "\n\n");
                event.preventDefault();
            }
        };

        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            selected?.classList.remove("omniyap-kb-selected");
        });
        ctx.css(`
            .msg.omniyap-kb-selected{background:rgba(139,57,253,.13);border-radius:8px;
                box-shadow:inset 3px 0 0 #8b39fd}
            .msg.omniyap-kb-selected .msg-body{outline:1px solid rgba(139,57,253,.22);outline-offset:5px;border-radius:6px}
        `);
    },
});
