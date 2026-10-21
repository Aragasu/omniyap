import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
    rules: {
        type: OptionType.STRING,
        description: "One rule per line: find => replace. Prefix with /regex/ for regular expressions.",
        default: "",
        multiline: true,
    },
    outgoing: {
        type: OptionType.BOOLEAN,
        description: "Also rewrite messages you send.",
        default: false,
    },
});

function parseRules() {
    const rules = [];
    for (const line of String(settings.store.rules || "").split("\n")) {
        const index = line.indexOf("=>");
        if (index < 0) continue;
        const find = line.slice(0, index).trim();
        const replace = line.slice(index + 2).trim();
        if (!find) continue;
        rules.push({ find, replace });
    }
    return rules;
}

function transform(text, rules) {
    let out = text;
    for (const rule of rules) {
        if (rule.find.startsWith("/") && rule.find.lastIndexOf("/") > 0) {
            const end = rule.find.lastIndexOf("/");
            const source = rule.find.slice(1, end);
            const flags = rule.find.slice(end + 1);
            try {
                out = out.replace(new RegExp(source, flags), rule.replace);
            } catch {
                /* invalid regex: skip */
            }
        } else {
            out = out.split(rule.find).join(rule.replace);
        }
    }
    return out;
}

export default definePlugin({
    name: "TextReplace",
    description: "Find-and-replace rules for incoming messages (and optionally what you send).",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        const decorate = ({ textEl }) => {
            if (!textEl || textEl.dataset.omniyapReplaced === "1") return;
            const rules = parseRules();
            if (!rules.length) return;
            const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) =>
                    node.parentElement?.closest("code, pre, a")
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_ACCEPT,
            });
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            for (const node of nodes) {
                const next = transform(node.nodeValue || "", rules);
                if (next !== node.nodeValue) node.nodeValue = next;
            }
            textEl.dataset.omniyapReplaced = "1";
        };

        ctx.cleanup(messages.decorate(decorate));

        if (settings.store.outgoing) {
            const onKeyDown = (event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                if (!(event.target instanceof HTMLTextAreaElement)) return;
                const next = transform(event.target.value, parseRules());
                if (next === event.target.value) return;
                const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
                setter?.call(event.target, next);
                event.target.dispatchEvent(new Event("input", { bubbles: true }));
            };
            document.addEventListener("keydown", onKeyDown, true);
            ctx.cleanup(() => document.removeEventListener("keydown", onKeyDown, true));
        }
    },
});
