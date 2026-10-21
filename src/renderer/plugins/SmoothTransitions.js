import { definePlugin } from "../core/api.js";

export default definePlugin({
    name: "SmoothTransitions",
    description: "Adds soft transitions to channel changes, hover states and the message list.",
    authors: [{ name: "OmniYap" }],
    tags: ["appearance"],
    start(ctx) {
        ctx.css(`
            *{scroll-behavior:smooth}
            .msg{transition:background-color .12s ease, opacity .15s ease}
            .channel-row,.rail-item,.pick-row,.icon-btn,.sidebar-head{transition:background-color .14s ease,color .14s ease,transform .14s ease}
            .rail-item:hover{transform:translateY(-1px)}
            .messages{transition:opacity .18s ease}
            .chat-wrap{animation:omniyap-fade .22s ease}
            @keyframes omniyap-fade{from{opacity:.55}to{opacity:1}}
            @media (prefers-reduced-motion: reduce){
                *{scroll-behavior:auto}
                .rail-item:hover{transform:none}
                .chat-wrap{animation:none}
            }
        `);
    },
});
