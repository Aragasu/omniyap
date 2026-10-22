import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";
import { h, addMessageAction } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const ENGINES = {
    ddg: { label: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
    google: { label: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    bing: { label: "Bing", url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    startpage: { label: "Startpage", url: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}` },
    brave: { label: "Brave", url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
    wikipedia: { label: "Wikipedia", url: (q) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` },
    youtube: { label: "YouTube", url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
};

const settings = definePluginSettings({
    engine: {
        type: OptionType.SELECT,
        description: "Default search engine.",
        options: Object.entries(ENGINES).map(([value, engine]) => ({ label: engine.label, value })),
        default: "ddg",
    },
    shortcut: { type: OptionType.BOOLEAN, description: "Ctrl+Shift+G searches the selected text.", default: true },
    composerAction: { type: OptionType.BOOLEAN, description: "Add a Search action to messages.", default: true },
});

export default definePlugin({
    name: "ReplaceGoogleSearch",
    description: "Search any selected text or message in DuckDuckGo, Google, Bing, Brave, Wikipedia or YouTube.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "productivity", "chat"],
    settings,

    start(ctx) {
        const search = (query) => {
            const text = String(query || "").trim();
            if (!text) return ctx.toast("Select some text first");
            const engine = h("select", { class: "omniyap-search", style: { width: "100%", marginTop: "8px" } },
                ...Object.entries(ENGINES).map(([value, info]) => h("option", { value, selected: value === settings.store.engine }, info.label)),
            );
            openModal({
                title: "Search the web",
                subtitle: "Opens in your browser",
                width: 460,
                body: h("div", {},
                    h("p", { class: "omniyap-muted" }, text),
                    engine,
                ),
                actions: [{
                    label: "Search",
                    primary: true,
                    onClick: ({ close }) => {
                        const target = ENGINES[engine.value] || ENGINES.ddg;
                        window.open(target.url(text), "_blank", "noopener,noreferrer");
                        close();
                    },
                }],
            });
        };

        const onKey = (event) => {
            if (!settings.store.shortcut || !event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "g") return;
            const input = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ? event.target : null;
            const selection = input ? input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0) : String(window.getSelection() || "");
            event.preventDefault();
            search(selection || input?.value || "");
        };

        const decorate = ({ el, textEl }) => {
            if (!settings.store.composerAction || el.querySelector('[data-omniyap-action="Search"]')) return;
            addMessageAction(el, {
                label: "Search",
                title: "Search this message on the web",
                html: "⌕",
                onClick: () => search(textEl?.innerText || ""),
            });
        };

        ctx.cleanup(messages.decorate(decorate));
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => document.removeEventListener("keydown", onKey, true));
        ctx.plugin.search = search;
        ctx.css(`[data-omniyap-action="Search"]{font-size:14px;width:26px;height:26px;padding:0}`);
    },
});
