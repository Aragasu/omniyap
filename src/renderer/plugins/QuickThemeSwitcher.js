import { definePlugin, definePluginSettings, OptionType, themes, settings as coreSettings } from "../core/api.js";
import { h, headerButton } from "./_shared.js";
import { openModal } from "../ui/modal.js";

const settings = definePluginSettings({
    shortcut: { type: OptionType.BOOLEAN, description: "Ctrl+Shift+] cycles through installed themes.", default: true },
    showHeaderButton: { type: OptionType.BOOLEAN, description: "Add a theme button to the chat header.", default: true },
});

function enabledFiles() {
    return new Set(coreSettings.get("themes.enabled", []) || []);
}

async function toggleNext() {
    const files = await themes.list();
    if (!files.length) return false;
    const enabled = enabledFiles();
    const index = files.findIndex((file) => enabled.has(file));
    enabled.clear();
    const next = files[(index + 1) % files.length];
    enabled.add(next);
    coreSettings.set("themes.enabled", [...enabled]);
    await themes.refresh();
    return next;
}

export default definePlugin({
    name: "QuickThemeSwitcher",
    description: "Switches between the themes in your themes folder without opening OmniYap settings.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "themes", "utility"],
    settings,

    start(ctx) {
        const open = async () => {
            const files = await themes.list();
            const enabled = enabledFiles();
            openModal({
                title: "Quick themes",
                subtitle: `${files.length} installed`,
                width: 520,
                body: files.length ? h("div", {}, ...files.map((file) => h("div", { class: "omniyap-row" },
                    h("div", { class: "label" }, h("b", {}, file), h("span", {}, enabled.has(file) ? "Active" : "Installed")),
                    h("button", {
                        class: `omniyap-btn${enabled.has(file) ? " primary" : ""}`,
                        onclick: async () => {
                            enabled.clear();
                            if (!enabled.has(file)) enabled.add(file);
                            coreSettings.set("themes.enabled", [...enabled]);
                            await themes.refresh();
                            document.querySelector(".omniyap-modal-root:not([hidden]) .omniyap-modal-head .icon-btn")?.click();
                            ctx.toast(`${file} applied`, { type: "success" });
                        },
                    }, enabled.has(file) ? "Reload" : "Apply"),
                ))) : h("div", { class: "omniyap-empty" }, "No theme files found. Add .css files to the themes folder in OmniYap settings."),
                actions: [{
                    label: "Turn all off",
                    onClick: async ({ close }) => {
                        coreSettings.set("themes.enabled", []);
                        await themes.refresh();
                        close();
                    },
                }],
            });
        };

        const onKey = async (event) => {
            if (!settings.store.shortcut || !event.ctrlKey || !event.shiftKey || event.code !== "BracketRight") return;
            event.preventDefault();
            const next = await toggleNext();
            ctx.toast(next ? `Theme: ${next}` : "No themes installed", { type: next ? "success" : "info" });
        };

        document.addEventListener("keydown", onKey, true);
        ctx.watch("header.main-head", () => {
            if (settings.store.showHeaderButton) headerButton({ className: "omniyap-theme-btn", title: "Quick themes", text: "◐", onClick: open });
        });
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.querySelector(".omniyap-theme-btn")?.remove();
        });
        ctx.css(`.omniyap-theme-btn{font-size:14px;width:26px;height:26px;padding:0}`);
    },
});
