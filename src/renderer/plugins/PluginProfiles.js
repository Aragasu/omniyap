import { definePlugin, settings, dom } from "../core/api.js";
import { h, localJson, formatTime } from "./_shared.js";
import { openModal } from "../ui/modal.js";
import ui from "../ui/settings.js";

const profiles = localJson("plugin-profiles", []);

function snapshot() {
    const pluginConfig = {};
    for (const [name, config] of Object.entries(settings.data.plugins || {})) pluginConfig[name] = { ...config };
    return { plugins: pluginConfig, at: Date.now() };
}

function applySnapshot(profile) {
    if (!profile?.plugins) return false;
    for (const [name, config] of Object.entries(profile.plugins)) {
        if (config && typeof config === "object") settings.set(`plugins.${name}`, config);
    }
    return true;
}

function saveProfile(name) {
    const list = profiles.read();
    profiles.write([...list, { name, ...snapshot() }]);
}

function importProfile(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed?.plugins) throw new Error("that JSON has no plugins object");
    return parsed;
}

function saveDialog(onSaved) {
    const input = h("input", {
        class: "omniyap-search",
        style: { width: "100%" },
        placeholder: "Profile name",
        value: `Profile ${profiles.read().length + 1}`,
    });
    openModal({
        title: "Save plugin profile",
        subtitle: "Stores the enabled state and options of every plugin",
        width: 480,
        body: h("div", {}, h("div", { class: "omniyap-muted", style: { marginBottom: "8px" } },
            "Profiles stay on this device. Copy one as JSON to share it."), input),
        actions: [{
            label: "Save",
            primary: true,
            onClick: ({ close }) => {
                const name = input.value.trim();
                if (!name) return dom.toast("Give the profile a name", { type: "error" });
                saveProfile(name);
                close();
                onSaved();
                dom.toast("Profile saved", { type: "success" });
            },
        }],
    });
}

function importDialog(onSaved) {
    const area = h("textarea", {
        class: "omniyap-css",
        style: { minHeight: "180px" },
        placeholder: "Paste a profile JSON here…",
    });
    openModal({
        title: "Import plugin profile",
        width: 560,
        body: area,
        actions: [{
            label: "Import",
            primary: true,
            onClick: ({ close }) => {
                try {
                    const profile = importProfile(area.value);
                    const list = profiles.read();
                    profiles.write([...list, { name: profile.name || `Imported ${formatTime()}`, ...profile }]);
                    close();
                    onSaved();
                    dom.toast("Profile imported", { type: "success" });
                } catch (err) {
                    dom.toast("Invalid profile: " + (err.message || err), { type: "error" });
                }
            },
        }],
    });
}

export default definePlugin({
    name: "PluginProfiles",
    description: "Save, export and restore whole plugin configurations.",
    authors: [{ name: "OmniYap" }],
    tags: ["utility", "productivity"],

    start(ctx) {
        let refresh = () => undefined;

        const render = () => {
            const list = profiles.read();
            return h("div", {},
                h("div", { style: { display: "flex", gap: "8px", marginBottom: "12px" } },
                    h("button", { class: "omniyap-btn primary", onclick: () => saveDialog(refresh) }, "Save current setup"),
                    h("button", { class: "omniyap-btn", onclick: () => importDialog(refresh) }, "Import JSON"),
                ),
                list.length
                    ? list.map((profile) => h("div", { class: "omniyap-row" },
                        h("div", { class: "label" },
                            h("b", {}, profile.name),
                            h("span", {}, `${Object.keys(profile.plugins || {}).length} plugins · ${formatTime(profile.at)}`),
                        ),
                        h("div", { style: { display: "flex", gap: "6px" } },
                            h("button", {
                                class: "omniyap-btn",
                                onclick: () => {
                                    applySnapshot(profile);
                                    dom.toast("Profile applied. Reloading…", { type: "success" });
                                    setTimeout(() => location.reload(), 700);
                                },
                            }, "Apply"),
                            h("button", {
                                class: "omniyap-btn",
                                onclick: () => {
                                    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
                                    dom.toast("Profile copied", { type: "success" });
                                },
                            }, "Copy"),
                            h("button", {
                                class: "omniyap-btn",
                                onclick: () => {
                                    profiles.write(profiles.read().filter((entry) => entry !== profile));
                                    refresh();
                                },
                            }, "Delete"),
                        ),
                    ))
                    : h("div", { class: "omniyap-muted" }, "No profiles yet."),
            );
        };

        const open = () => {
            openModal({
                title: "Plugin profiles",
                subtitle: "Save a setup and switch back to it later",
                width: 640,
                body: h("div"),
                onMount: (bodyEl) => {
                    refresh = () => bodyEl.replaceChildren(render());
                    refresh();
                },
            });
        };

        ctx.cleanup(ui.registerTool({
            id: "plugin-profiles",
            label: "Plugin profiles",
            icon: "◈",
            description: "Save a plugin setup, copy it as JSON, or restore it later.",
            onClick: open,
        }));

        // Expose for the App tab / DevTools.
        ctx.plugin.open = open;
    },
});
