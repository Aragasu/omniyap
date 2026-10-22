import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h, headerButton, insertIntoComposer, localJson } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const templates = localJson("message-templates", [
    { name: "Welcome", text: "Welcome! Grab a role and say hi 👋" },
    { name: "Rules", text: "Please keep it friendly, on-topic and spoiler-tagged." },
]);

const settings = definePluginSettings({
    quickSlots: { type: OptionType.BOOLEAN, description: "Show the first three templates as header buttons.", default: false },
});

function save(list) {
    templates.write(list.slice(0, 60));
}

function editor(onChange) {
    const list = templates.read();
    const name = h("input", { class: "omniyap-search", style: { width: "100%" }, placeholder: "Template name" });
    const text = h("textarea", { class: "omniyap-css", style: { minHeight: "80px" }, placeholder: "Message text…" });
    const rows = h("div", { style: { display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" } });

    const render = () => {
        const current = templates.read();
        rows.replaceChildren(...(current.length ? current.map((template, index) => h("div", { class: "omniyap-row" },
            h("div", { class: "label", style: { minWidth: 0 } },
                h("b", {}, template.name),
                h("span", { style: { whiteSpace: "pre-wrap" } }, template.text.slice(0, 160)),
            ),
            h("div", { style: { display: "flex", gap: "6px" } },
                h("button", { class: "omniyap-btn", onclick: () => insertIntoComposer(template.text) }, "Insert"),
                h("button", {
                    class: "omniyap-btn",
                    onclick: () => {
                        save(current.filter((_, i) => i !== index));
                        render();
                    },
                }, "Delete"),
            ),
        )) : [h("div", { class: "omniyap-empty" }, "No templates yet.")]));
    };

    openModal({
        title: "Message templates",
        subtitle: "Reusable snippets, stored locally",
        width: 620,
        body: h("div", {}, name, text,
            h("button", {
                class: "omniyap-btn primary",
                style: { marginTop: "8px" },
                onclick: () => {
                    if (!name.value.trim() || !text.value.trim()) return;
                    save([...templates.read(), { name: name.value.trim().slice(0, 40), text: text.value }]);
                    name.value = "";
                    text.value = "";
                    render();
                    onChange?.();
                },
            }, "Add template"),
            rows,
        ),
        onMount: render,
    });
}

export default definePlugin({
    name: "MessageTemplates",
    description: "Saves reusable message snippets and inserts them into the composer with one click.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "productivity", "utility"],
    settings,

    start(ctx) {
        const open = () => editor();
        const mount = () => {
            headerButton({ className: "omniyap-template-btn", title: "Message templates", text: "≡", onClick: open });
            if (!settings.store.quickSlots) {
                document.querySelectorAll(".omniyap-template-slot").forEach((button) => button.remove());
                return;
            }
            templates.read().slice(0, 3).forEach((template, index) => {
                const head = document.querySelector("header.main-head, .chat .main-head");
                if (!head || head.querySelector(`.omniyap-template-slot[data-index="${index}"]`)) return;
                const button = h("button", {
                    class: "icon-btn omniyap-template-slot",
                    "data-index": index,
                    title: template.name,
                    onclick: () => insertIntoComposer(template.text),
                }, String(index + 1));
                head.appendChild(button);
            });
        };

        ctx.watch("header.main-head", mount);
        ctx.cleanup(settings.onChange(mount));
        ctx.cleanup(() => document.querySelectorAll(".omniyap-template-btn, .omniyap-template-slot").forEach((button) => button.remove()));
        ctx.css(`
            .omniyap-template-btn{font-size:16px;width:26px;height:26px;padding:0}
            .omniyap-template-slot{font:700 10px Inter,system-ui,sans-serif;width:22px;height:22px;padding:0;opacity:.65}
        `);
        mount();
    },
});
