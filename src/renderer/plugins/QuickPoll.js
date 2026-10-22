import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, headerButton, sendMessage } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const NUMBERS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const settings = definePluginSettings({
    maxOptions: { type: OptionType.SLIDER, description: "Maximum number of options.", default: 8, min: 2, max: 10, step: 1 },
    anonymous: { type: OptionType.BOOLEAN, description: "Say that votes are anonymous (reacting is still public).", default: false },
});

export default definePlugin({
    name: "QuickPoll",
    description: "Builds a numbered poll and sends it to the channel, with emoji numbers to react with.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility", "fun"],
    settings,

    start(ctx) {
        const open = () => {
            const question = h("input", { class: "omniyap-search", style: { width: "100%" }, placeholder: "What should we play tonight?" });
            const options = h("textarea", {
                class: "omniyap-css",
                style: { minHeight: "120px", marginTop: "8px" },
                placeholder: "One option per line\nValorant\nMinecraft\nSomething co-op",
            });
            openModal({
                title: "Quick poll",
                subtitle: "Sends a message you can vote on with reactions",
                width: 520,
                body: h("div", {},
                    question,
                    options,
                    h("p", { class: "omniyap-muted" }, `Line 1 becomes ${NUMBERS[0]}, line 2 becomes ${NUMBERS[1]}, and so on.`),
                ),
                actions: [{
                    label: "Send poll",
                    primary: true,
                    onClick: async ({ close }) => {
                        const title = question.value.trim();
                        const choices = options.value.split("\n").map((line) => line.trim()).filter(Boolean)
                            .slice(0, Math.max(2, Math.min(10, Number(settings.store.maxOptions) || 8)));
                        if (!title) return ctx.toast("Add a poll question", { type: "error" });
                        if (choices.length < 2) return ctx.toast("Add at least two options", { type: "error" });
                        const body = [
                            `📊 **${title}**`,
                            "",
                            ...choices.map((choice, index) => `${NUMBERS[index]} ${choice}`),
                            "",
                            settings.store.anonymous
                                ? "React with a number to vote. (Votes are visible to everyone in the channel.)"
                                : "React with a number to vote.",
                        ].join("\n");
                        const ok = await sendMessage(body);
                        if (ok) {
                            close();
                            ctx.toast("Poll sent", { type: "success" });
                        } else {
                            ctx.toast("Open a channel first", { type: "error" });
                        }
                    },
                }],
                onMount: () => question.focus(),
            });
        };

        ctx.watch("header.main-head", () => headerButton({
            className: "omniyap-poll-btn",
            title: "Quick poll",
            text: "📊",
            onClick: open,
        }));
        ctx.cleanup(() => document.querySelector(".omniyap-poll-btn")?.remove());
        ctx.css(`.omniyap-poll-btn{font-size:12px;width:26px;height:26px;padding:0;filter:grayscale(.45)}`);
    },
});
