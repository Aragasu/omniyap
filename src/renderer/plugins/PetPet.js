import { definePlugin } from "../core/api.js";
import { h } from "./_shared.js";

export default definePlugin({
    name: "PetPet",
    description: "Pet someone's avatar and watch it wiggle.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "media"],

    start(ctx) {
        const pet = (avatar) => {
            if (avatar.querySelector(".omniyap-pet")) return;
            const image = avatar.querySelector("img, canvas");
            if (!image) return;
            const wrapper = h("div", { class: "omniyap-pet" }, image.cloneNode(true));
            avatar.appendChild(wrapper);
            const hearts = h("div", { class: "omniyap-pet-hearts" }, "❤", "❤", "❤");
            avatar.appendChild(hearts);
            setTimeout(() => {
                wrapper.remove();
                hearts.remove();
            }, 2200);
            const count = Number(localStorage.getItem("omniyap:pets") || 0) + 1;
            localStorage.setItem("omniyap:pets", String(count));
        };

        const onClick = (event) => {
            if (!event.altKey) return;
            const avatar = event.target instanceof Element ? event.target.closest(".msg .avatar, .members-panel .avatar") : null;
            if (!avatar) return;
            event.preventDefault();
            event.stopPropagation();
            pet(avatar);
        };

        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));

        ctx.css(`
            .omniyap-pet{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:3}
            .omniyap-pet img,.omniyap-pet canvas{width:100% !important;height:100% !important;object-fit:cover;
                animation:omniyap-pet-wiggle .28s ease-in-out 6 alternate;transform-origin:50% 90%}
            @keyframes omniyap-pet-wiggle{
                0%{transform:rotate(-6deg) translateY(0)}
                50%{transform:rotate(7deg) translateY(-2px) scale(1.04)}
                100%{transform:rotate(-4deg) translateY(0)}
            }
            .omniyap-pet-hearts{position:absolute;left:50%;top:-6px;transform:translateX(-50%);display:flex;gap:2px;pointer-events:none;z-index:4}
            .omniyap-pet-hearts span{color:#ff6b8a;font-size:9px;animation:omniyap-heart .9s ease forwards}
            @keyframes omniyap-heart{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-18px) scale(1.4)}}
            .avatar{position:relative}
        `);
        ctx.log.info("Alt-click an avatar to pet it");
    },
});
