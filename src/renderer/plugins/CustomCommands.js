import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { getComposer, setNativeValue } from "./_shared.js";

const settings = definePluginSettings({
    commands: {
        type: OptionType.STRING,
        description: "One per line: /name = text to insert.",
        default: "/shrug = ¯\\_(ツ)_/¯\n/tableflip = (╯°□°)╯︵ ┻━┻",
        multiline: true,
    },
});

function parse() {
    const map = new Map();
    for (const line of String(settings.store.commands || "").split("\n")) {
        const index = line.indexOf("=");
        if (index < 0) continue;
        const name = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        if (name) map.set(name.toLowerCase(), value);
    }
    return map;
}

export default definePlugin({
    name: "CustomCommands",
    description: "Expand /shortcuts into saved text before a message is sent.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const onKeyDown = (event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            const composer = getComposer();
            if (!composer || event.target !== composer) return;
            const value = composer.value;
            if (!value.startsWith("/")) return;
            const map = parse();
            const [first, ...rest] = value.split(" ");
            const replacement = map.get(first.toLowerCase());
            if (!replacement) return;
            const next = [replacement, ...rest].join(" ");
            setNativeValue(composer, next);
            event.preventDefault();
            event.stopPropagation();
            // Send the expanded text on the next tick, once React has the new value.
            setTimeout(() => {
                const send = document.querySelector(".composer .send-btn, .composer-box .send-btn");
                if (send instanceof HTMLElement) send.click();
                else composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            }, 30);
        };

        document.addEventListener("keydown", onKeyDown, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKeyDown, true));
    },
});
