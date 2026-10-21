// Access to Yapper's own client store. It is a zustand-style store module exporting
// useStore / setState / getState / upsertMessages / removeMessage; we locate it by those names
// rather than by a Turbopack id, which changes on every deploy.
import OmniYap from "./state.js";
import { finder } from "./turbo.js";
import events from "./events.js";
import log from "./log.js";

const STORE_EXPORTS = ["useStore", "setState", "getState", "upsertMessages", "removeMessage"];

let resolveReady;
const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
});

const messageIndexes = new Map();
const MAX_INDEXES = 16;

function indexMessages(channelId, list) {
    const cached = messageIndexes.get(channelId);
    if (cached && cached.list === list && cached.length === list.length) {
        messageIndexes.delete(channelId);
        messageIndexes.set(channelId, cached);
        return cached.byId;
    }
    const byId = new Map();
    for (const message of list) if (message && message.id != null) byId.set(message.id, message);
    messageIndexes.delete(channelId);
    messageIndexes.set(channelId, { list, length: list.length, byId });
    while (messageIndexes.size > MAX_INDEXES) messageIndexes.delete(messageIndexes.keys().next().value);
    return byId;
}

export const store = (OmniYap.store = {
    api: null,
    hook: null,
    ready: readyPromise,
    isReady: false,

    getState() {
        return store.api ? store.api.getState() : null;
    },

    setState(partial) {
        if (!store.api) throw new Error("Yapper's store is not ready yet");
        return store.api.setState(partial);
    },

    subscribe(fn) {
        if (!store.hook) return () => undefined;
        return store.hook.subscribe(fn);
    },

    me() {
        const state = store.getState();
        return state?.userId ? state.profiles?.[state.userId] || null : null;
    },

    myId() {
        return store.getState()?.userId || null;
    },

    profile(id) {
        return store.getState()?.profiles?.[id] || null;
    },

    displayName(userId) {
        const profile = store.profile(userId);
        return profile?.display_name || profile?.username || "Unknown";
    },

    username(userId) {
        const profile = store.profile(userId);
        return profile?.username || "unknown";
    },

    channel(id) {
        return store.getState()?.channels?.[id] || null;
    },

    server(id) {
        const state = store.getState();
        return state?.servers?.[id] || null;
    },

    servers() {
        const state = store.getState();
        return state?.servers || {};
    },

    /** Member ids of a server (Yapper keeps `serverMembers` as a map of server -> id[]). */
    members(serverId) {
        const state = store.getState();
        if (!state) return [];
        const byServer = state.serverMembers;
        if (serverId && byServer && byServer[serverId]) {
            const value = byServer[serverId];
            return Array.isArray(value) ? value : Object.keys(value);
        }
        const members = state.members;
        if (!members) return [];
        if (Array.isArray(members)) return members.filter((m) => !serverId || m.server_id === serverId);
        const value = members[serverId];
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") return Object.values(value);
        return [];
    },

    /** The server's total member count, when Yapper has fetched it. */
    memberCount(serverId) {
        const state = store.getState();
        const counted = state?.memberCounts?.[serverId];
        if (Number.isFinite(Number(counted)) && Number(counted) > 0) return Number(counted);
        const server = store.server(serverId);
        const fallback = server?.member_count ?? server?.members_count;
        if (Number.isFinite(Number(fallback)) && Number(fallback) > 0) return Number(fallback);
        return store.members(serverId).length;
    },

    /** Presence map: userId -> "online" | "idle" | "dnd" | "offline". */
    online(userId) {
        return store.getState()?.online?.[userId] || null;
    },

    /** Set of blocked user ids (Yapper stores `blocked` as { userId: … }). */
    blockedUsers() {
        const state = store.getState();
        const raw = state?.blocked || {};
        const ids = new Set();
        if (Array.isArray(raw)) {
            for (const entry of raw) ids.add(typeof entry === "string" ? entry : entry?.id || entry?.user_id);
            ids.delete(undefined);
            return ids;
        }
        for (const [id, value] of Object.entries(raw)) {
            if (value !== false && value !== null && value !== "none" && value !== 0) ids.add(id);
        }
        return ids;
    },

    activeChannelId() {
        return store.getState()?.activeChannelId || null;
    },

    activeChannel() {
        return store.channel(store.activeChannelId());
    },

    messages(channelId) {
        return store.getState()?.messages?.[channelId] || [];
    },

    /** Look a message up by id across every loaded channel. */
    findMessage(id) {
        const state = store.getState();
        if (!state || !id) return null;
        const messages = state.messages || {};
        const activeId = state.activeChannelId;
        if (Array.isArray(messages[activeId])) {
            const hit = indexMessages(activeId, messages[activeId]).get(id);
            if (hit) return hit;
        }
        for (const [channelId, list] of Object.entries(messages)) {
            if (channelId === activeId || !Array.isArray(list)) continue;
            const hit = indexMessages(channelId, list).get(id);
            if (hit) return hit;
        }
        return state.extraMessages?.[id] || null;
    },

    /** DMs and group chats have no server. */
    isDmChannel(channelId) {
        const channel = store.channel(channelId);
        return !!channel && !channel.server_id;
    },

    channelName(channelId) {
        const channel = store.channel(channelId);
        if (!channel) return "";
        if (!channel.server_id) {
            const state = store.getState();
            const members = channel.members || channel.recipients || [];
            const names = members.map((id) => store.displayName(id)).filter(Boolean);
            return channel.name || names.join(", ") || "Direct message";
        }
        return channel.name || "";
    },

    /** Yapper's own chat actions (sendMessage, deleteMessage, markRead, openDmWith, …). */
    live() {
        return finder.findExports(["markRead", "sendMessage", "deleteMessage", "dispatchLive"]);
    },

    openSettings(tab) {
        store.setState({ settingsAt: tab || "open" });
    },

    closeSettings() {
        store.setState({ settingsAt: null });
    },
});

finder
    .waitFor(STORE_EXPORTS, { interval: 200 })
    .then((api) => {
        if (!api) {
            log.warn("Yapper's store was not found; store-dependent plugins will stay idle");
            return;
        }
        store.api = api;
        store.hook = api.useStore;
        store.isReady = true;
        try {
            store.hook.subscribe((state, previous) => events.emit("store:change", state, previous));
        } catch (err) {
            log.error("could not subscribe to Yapper's store", err);
        }
        log.info("Yapper store ready");
        resolveReady(api);
        events.emit("store:ready", api);
    })
    .catch((err) => log.error("store lookup failed", err));

export default store;
