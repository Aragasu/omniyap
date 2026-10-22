import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, getComposer } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const INLINE = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)|\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\|\|([\s\S]+?)\|\||\*([^*\n]+?)\*|(?<![\w])_([^_\n]+?)_(?![\w])|(https?:\/\/[^\s<]+[^\s<.,:;"')\]}!?])/g;

function inline(text) {
    const out = [];
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        if (match.index > last) out.push(text.slice(last, match.index));
        if (match[2] !== undefined) out.push(h("code", {}, match[2]));
        else if (match[3] !== undefined) out.push(h("strong", {}, h("em", {}, inline(match[3]))));
        else if (match[4] !== undefined) out.push(h("strong", {}, inline(match[4])));
        else if (match[5] !== undefined) out.push(h("u", {}, inline(match[5])));
        else if (match[6] !== undefined) out.push(h("s", {}, inline(match[6])));
        else if (match[7] !== undefined) out.push(h("span", { class: "omniyap-pm-spoiler" }, inline(match[7])));
        else if (match[8] !== undefined) out.push(h("em", {}, inline(match[8])));
        else if (match[9] !== undefined) out.push(h("em", {}, inline(match[9])));
        else if (match[10] !== undefined) out.push(h("a", { href: match[10], target: "_blank", rel: "noopener noreferrer nofollow" }, match[10]));
        last = match.index + match[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

function render(text) {
    const out = [];
    const source = String(text || "");
    let index = 0;
    for (const match of source.matchAll(/```(?:[a-z0-9+-]*\n)?([\s\S]*?)```/gi)) {
        if (match.index > index) out.push(...paragraphs(source.slice(index, match.index)));
        out.push(h("pre", { class: "omniyap-pm-pre" }, h("code", {}, match[1].replace(/\n$/, ""))));
        index = match.index + match[0].length;
        if (source[index] === "\n") index++;
    }
    if (index < source.length) out.push(...paragraphs(source.slice(index)));
    return out;
}

function paragraphs(text) {
    const lines = text.split("\n");
    const out = [];
    for (let index = 0; index < lines.length;) {
        const line = lines[index];
        let match;
        if ((match = /^(#{1,3})\s+(.+)$/.exec(line))) {
            out.push(h("div", { class: `omniyap-pm-h omniyap-pm-h${match[1].length}` }, inline(match[2])));
            index++;
            continue;
        }
        if (/^>\s?/.test(line)) {
            const quoted = [];
            while (index < lines.length && /^>\s?/.test(lines[index])) quoted.push(lines[index++].replace(/^>\s?/, ""));
            out.push(h("blockquote", { class: "omniyap-pm-quote" }, paragraphs(quoted.join("\n"))));
            continue;
        }
        if (/^\s*[-*]\s+/.test(line)) {
            const items = [];
            while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
                items.push(h("li", {}, inline(lines[index++].replace(/^\s*[-*]\s+/, ""))));
            }
            out.push(h("ul", { class: "omniyap-pm-list" }, items));
            continue;
        }
        const paragraph = [];
        while (index < lines.length && !/^(#{1,3}\s+.+|>\s?.*|\s*[-*]\s+.+)$/.test(lines[index])) {
            paragraph.push(lines[index++]);
        }
        out.push(h("div", {}, inline(paragraph.join("\n"))));
    }
    return out;
}

const settings = definePluginSettings({
    showButton: { type: OptionType.BOOLEAN, description: "Show the Preview button next to the message box.", default: true },
    shortcut: { type: OptionType.BOOLEAN, description: "Ctrl+Shift+P opens the preview too.", default: true },
});

function openPreview(text) {
    const me = store.me();
    openModal({
        title: "Message preview",
        subtitle: "This is how your message will look. It has not been sent.",
        width: 640,
        body: h("div", { class: "omniyap-pm" },
            String(text || "").trim()
                ? h("div", {},
                    h("div", { class: "omniyap-pm-author" }, me?.display_name || me?.username || "You"),
                    h("div", { class: "omniyap-pm-text" }, ...render(text)),
                )
                : h("div", { class: "omniyap-muted" }, "The message box is empty."),
        ),
    });
}

export default definePlugin({
    name: "PreviewMessage",
    description: "Previews how your message will look (bold, quotes, code, links, lists) before you send it. Ctrl+Shift+P also works.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        // Feather's "eye" icon (MIT), unchanged from the original icon set.
        const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

        const sync = () => {
            if (!settings.store.showButton) return;
            document.querySelectorAll(".composer, .composer-box").forEach((composer) => {
                const tools = composer.querySelector(".composer-tools") || composer.querySelector(".composer-actions");
                if (!tools || tools.querySelector(".omniyap-pm-btn")) return;
                tools.prepend(h("button", {
                    type: "button",
                    class: "icon-btn omniyap-pm-btn",
                    title: "Preview message",
                    "aria-label": "Preview message",
                    html: EYE,
                    onclick: () => openPreview(getComposer()?.value || ""),
                }));
            });
        };

        const onKey = (event) => {
            if (!settings.store.shortcut) return;
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
                event.preventDefault();
                openPreview(getComposer()?.value || "");
            }
        };

        ctx.css(`
            .omniyap-pm{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px}
            .omniyap-pm-author{font-weight:700;margin-bottom:6px}
            .omniyap-pm-text{white-space:pre-wrap;word-break:break-word}
            .omniyap-pm-text a{color:#b57bff}
            .omniyap-pm-pre{white-space:pre-wrap;background:#12121a;border:1px solid rgba(255,255,255,.07);
                border-radius:8px;padding:9px;margin:6px 0;font:12px/1.5 ui-monospace,monospace}
            .omniyap-pm-quote{border-left:3px solid #8b39fd;margin:6px 0;padding:2px 0 2px 10px;color:#b9bbc4}
            .omniyap-pm-list{margin:6px 0;padding-left:20px}
            .omniyap-pm-spoiler{background:rgba(255,255,255,.12);border-radius:4px;padding:0 3px}
            .omniyap-pm-h{font-weight:700;margin:8px 0 3px}
            .omniyap-pm-h1{font-size:1.3em}.omniyap-pm-h2{font-size:1.16em}.omniyap-pm-h3{font-size:1.05em}
        `);

        ctx.watch(".composer-tools, .composer", sync);
        ctx.onMutate(sync);
        window.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => window.removeEventListener("keydown", onKey, true));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-pm-btn").forEach((node) => node.remove()));

        sync();
    },
});
