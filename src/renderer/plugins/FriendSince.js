import { definePlugin, store } from "../core/api.js";
import { localJson } from "./_shared.js";

const since = localJson("friend-since", {});

export default definePlugin({
    name: "FriendSince",
    description: "Remembers when each friendship started on this device and shows it on the person's profile card.",
    authors: [{ name: "OmniYap" }],
    tags: ["people", "utility"],

    start(ctx) {
        const scan = (state) => {
            const friends = state?.friends || {};
            const saved = since.read() || {};
            let changed = false;
            for (const [id, status] of Object.entries(friends)) {
                if (status !== "accepted" || saved[id]) continue;
                saved[id] = Date.now();
                changed = true;
            }
            if (changed) since.write(saved);
        };

        // The label lives in a data attribute plus CSS ::after. Injecting a sibling node here made
        // React reconcile against a child it did not own, which could retrigger this handler forever.
        const sync = () => {
            const card = document.querySelector(".profile-card");
            if (!card) return;
            const userId = store.getState()?.profileCard;
            if (!userId) return;
            const at = (since.read() || {})[userId];
            const accepted = store.getState()?.friends?.[userId] === "accepted";
            if (!at || !accepted) {
                card.removeAttribute("data-omniyap-friend-since");
                return;
            }
            const label = `Friends since ${new Date(at).toLocaleDateString()}`;
            if (card.getAttribute("data-omniyap-friend-since") !== label) {
                card.setAttribute("data-omniyap-friend-since", label);
            }
        };

        scan(store.getState());
        ctx.on("store:change", (state, previous) => {
            if (state.friends !== previous.friends) scan(state);
            sync();
        });
        ctx.onMutate(sync);
        ctx.cleanup(() => document.querySelectorAll("[data-omniyap-friend-since]").forEach((node) => node.removeAttribute("data-omniyap-friend-since")));
        ctx.css(`
            .profile-card[data-omniyap-friend-since]::after{
                content:attr(data-omniyap-friend-since);display:block;margin:0 14px 10px;font:600 10.5px Inter,system-ui,sans-serif;
                color:#c3b0e6;background:rgba(139,57,253,.12);border:1px solid rgba(139,57,253,.26);
                border-radius:7px;padding:4px 8px;text-align:center
            }
        `);
        sync();
    },
});
