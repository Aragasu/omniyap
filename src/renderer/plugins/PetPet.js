// Uses the original "petpet" animation frames from VenPlugs/petpet (the same frames Vencord's
// petpet plugin composites with), 10 frames of 112×112 at 20 ms per frame. The petting hand is the
// real artwork; the avatar is drawn underneath it, exactly like the classic petpet GIF.
import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { h } from "./_shared.js";
import pet0 from "../../../assets/petpet/pet0.gif";
import pet1 from "../../../assets/petpet/pet1.gif";
import pet2 from "../../../assets/petpet/pet2.gif";
import pet3 from "../../../assets/petpet/pet3.gif";
import pet4 from "../../../assets/petpet/pet4.gif";
import pet5 from "../../../assets/petpet/pet5.gif";
import pet6 from "../../../assets/petpet/pet6.gif";
import pet7 from "../../../assets/petpet/pet7.gif";
import pet8 from "../../../assets/petpet/pet8.gif";
import pet9 from "../../../assets/petpet/pet9.gif";

const FRAMES = [pet0, pet1, pet2, pet3, pet4, pet5, pet6, pet7, pet8, pet9];
const FRAME_MS = 20;

const settings = definePluginSettings({
    loops: { type: OptionType.SLIDER, description: "How many times the petting animation plays.", default: 6, min: 1, max: 20, step: 1 },
});

export default definePlugin({
    name: "PetPet",
    description: "Alt-click an avatar to pet it, using the original petpet animation frames.",
    authors: [{ name: "VenPlugs" }, { name: "OmniYap" }],
    tags: ["fun", "media"],
    settings,

    start(ctx) {
        // Decode the frames once so the animation never waits on the network or a decode.
        for (const source of FRAMES) {
            const image = new Image();
            image.src = source;
        }

        const active = new Set();

        const pet = (avatar) => {
            if (avatar.querySelector(".omniyap-pet")) return;
            const image = avatar.querySelector("img, canvas");
            if (!image) return;
            const source = image.currentSrc || image.src;
            if (!source) return;

            const frame = h("img", { class: "omniyap-pet-frame", src: FRAMES[0], alt: "", "aria-hidden": "true" });
            const box = h("div", { class: "omniyap-pet", "aria-hidden": "true" },
                h("img", { class: "omniyap-pet-avatar", src: source, alt: "" }),
                frame,
            );
            if (getComputedStyle(avatar).position === "static") {
                avatar.style.position = "relative";
                box.dataset.omniyapPositioned = "1";
            }
            avatar.appendChild(box);
            active.add(box);

            const started = performance.now();
            const loops = Math.max(1, Math.min(20, Number(settings.store.loops) || 6));
            const duration = loops * FRAMES.length * FRAME_MS;
            let index = -1;
            let raf = null;

            const tick = () => {
                const elapsed = performance.now() - started;
                if (elapsed >= duration) {
                    stop(box);
                    return;
                }
                const next = Math.floor(elapsed / FRAME_MS) % FRAMES.length;
                if (next !== index) {
                    index = next;
                    frame.src = FRAMES[next];
                }
                box.dataset.omniyapRaf = String(requestAnimationFrame(tick));
            };
            box.dataset.omniyapRaf = String(requestAnimationFrame(tick));
        };

        const stop = (box) => {
            const raf = Number(box.dataset.omniyapRaf);
            if (raf) cancelAnimationFrame(raf);
            const avatar = box.parentElement;
            box.remove();
            active.delete(box);
            if (avatar && box.dataset.omniyapPositioned) avatar.style.position = "";
        };

        const onClick = (event) => {
            if (!event.altKey) return;
            const avatar = event.target instanceof Element ? event.target.closest(".avatar") : null;
            if (!avatar) return;
            event.preventDefault();
            event.stopPropagation();
            pet(avatar);
        };

        document.addEventListener("click", onClick, true);
        ctx.cleanup(() => document.removeEventListener("click", onClick, true));
        ctx.cleanup(() => {
            for (const box of [...active]) stop(box);
        });
        ctx.css(`
            .omniyap-pet{position:absolute;inset:0;z-index:6;overflow:hidden;border-radius:inherit;pointer-events:none}
            .omniyap-pet-avatar,.omniyap-pet-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
            .omniyap-pet-frame{image-rendering:pixelated}
        `);
        ctx.log.info("Alt-click an avatar to pet it");
    },
});
