import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { headerButton, localJson } from "./_shared.js";

const state = localJson("collapsed-ui", { servers: false, sidebar: false, members: false });

const settings = definePluginSettings({
    showButtons: { type: OptionType.BOOLEAN, description: "Add collapse buttons to the chat header.", default: true },
    shortcuts: { type: OptionType.BOOLEAN, description: "Enable Alt+Shift+1/2/3 shortcuts.", default: true },
});

function applyState() {
    const current = state.read();
    const root = document.documentElement;
    for (const key of ["servers", "sidebar", "members"]) {
        root.toggleAttribute(`data-omniyap-collapse-${key}`, !!current[key]);
    }
}

function toggle(key) {
    const current = state.read();
    current[key] = !current[key];
    state.write(current);
    applyState();
}

export default definePlugin({
    name: "CollapsibleUi",
    description: "Collapse the server rail, channel list or member list to give messages more room.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance", "navigation"],
    settings,

    start(ctx) {
        const mount = () => {
            if (!settings.store.showButtons) return;
            headerButton({
                className: "omniyap-collapse-servers",
                title: "Collapse server rail",
                text: "▤",
                onClick: () => toggle("servers"),
            });
            headerButton({
                className: "omniyap-collapse-sidebar",
                title: "Collapse channel list",
                text: "▥",
                onClick: () => toggle("sidebar"),
            });
            headerButton({
                className: "omniyap-collapse-members",
                title: "Collapse member list",
                text: "▦",
                onClick: () => toggle("members"),
            });
        };

        const onKey = (event) => {
            if (!settings.store.shortcuts || !event.altKey || !event.shiftKey) return;
            const map = { "1": "servers", "2": "sidebar", "3": "members" };
            const key = map[event.key];
            if (!key) return;
            event.preventDefault();
            toggle(key);
        };

        document.addEventListener("keydown", onKey, true);
        ctx.watch("header.main-head", mount);
        ctx.cleanup(() => {
            document.removeEventListener("keydown", onKey, true);
            document.querySelectorAll(".omniyap-collapse-servers, .omniyap-collapse-sidebar, .omniyap-collapse-members")
                .forEach((button) => button.remove());
        });
        ctx.css(`
            [data-omniyap-collapse-servers] .server-rail,
            [data-omniyap-collapse-servers] .server-list,
            [data-omniyap-collapse-servers] .guilds{display:none!important}
            [data-omniyap-collapse-sidebar] .sidebar{display:none!important}
            [data-omniyap-collapse-members] .members-panel{display:none!important}
            .omniyap-collapse-servers,.omniyap-collapse-sidebar,.omniyap-collapse-members{font-size:14px;width:26px;height:26px;padding:0;color:#8f93a3}
            .omniyap-collapse-servers:hover,.omniyap-collapse-sidebar:hover,.omniyap-collapse-members:hover{color:#d9c2ff}
        `);
        ctx.onMutate(mount);
        applyState();
        ctx.cleanup(() => {
            document.documentElement.removeAttribute("data-omniyap-collapse-servers");
            document.documentElement.removeAttribute("data-omniyap-collapse-sidebar");
            document.documentElement.removeAttribute("data-omniyap-collapse-members");
        });
        mount();
    },
});
