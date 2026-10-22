// A port of oneko.js by adryd325 (https://github.com/adryd325/oneko.js), itself a port of the
// original X11 oneko by Tatsuya Kato. The sprite sheet is the real oneko.gif (8×4 frames of 32 px),
// vendored from that project, so the cat looks and animates exactly like the classic one.
import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { localJson } from "./_shared.js";
import spriteSheet from "../../../assets/oneko.gif";

const FRAME = 32;
const SPEED = 10;

const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
    scratchWallN: [[0, 0], [0, -1]],
    scratchWallS: [[-7, -1], [-6, -2]],
    scratchWallE: [[-2, -2], [-2, -3]],
    scratchWallW: [[-4, 0], [-4, -1]],
    tired: [[-3, -2]],
    sleeping: [[-2, 0], [-2, -1]],
    N: [[-1, -2], [-1, -3]],
    NE: [[0, -2], [0, -3]],
    E: [[-3, 0], [-3, -1]],
    SE: [[-5, -1], [-5, -2]],
    S: [[-6, -3], [-7, -2]],
    SW: [[-5, -3], [-6, -1]],
    W: [[-4, -2], [-4, -3]],
    NW: [[-1, 0], [-1, -1]],
};

const settings = definePluginSettings({
    speed: { type: OptionType.SLIDER, description: "Pixels the cat moves per frame.", default: SPEED, min: 4, max: 24, step: 1 },
    size: { type: OptionType.SLIDER, description: "Cat size in pixels.", default: 32, min: 24, max: 64, step: 4 },
    persistPosition: { type: OptionType.BOOLEAN, description: "Remember where the cat was between launches.", default: true },
});

export default definePlugin({
    name: "oneko",
    description: "The classic oneko cat from the original X11 toy: it chases the pointer, scratches walls, gets tired and sleeps when nothing happens.",
    authors: [{ name: "adryd325" }, { name: "Tatsuya Kato" }, { name: "OmniYap" }],
    tags: ["fun", "appearance"],
    settings,

    start(ctx) {
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            ctx.log.info("oneko is off because reduced motion is requested");
            return;
        }

        const stored = localJson("oneko", null);
        const saved = settings.store.persistPosition ? stored.read() : null;

        let nekoPosX = Number.isFinite(saved?.nekoPosX) ? saved.nekoPosX : 32;
        let nekoPosY = Number.isFinite(saved?.nekoPosY) ? saved.nekoPosY : 32;
        let mousePosX = Number.isFinite(saved?.mousePosX) ? saved.mousePosX : 0;
        let mousePosY = Number.isFinite(saved?.mousePosY) ? saved.mousePosY : 0;
        let frameCount = 0;
        let idleTime = 0;
        let idleAnimation = null;
        let idleAnimationFrame = 0;
        let raf = null;
        let lastFrame = 0;

        const neko = document.createElement("div");
        neko.className = "omniyap-oneko";
        neko.setAttribute("aria-hidden", "true");
        neko.style.backgroundImage = `url(${spriteSheet})`;

        const frameSize = () => Math.max(24, Math.min(64, Number(settings.store.size) || FRAME));

        const place = () => {
            const size = frameSize();
            const ratio = size / FRAME;
            neko.style.width = `${size}px`;
            neko.style.height = `${size}px`;
            neko.style.backgroundSize = `${FRAME * 8 * ratio}px ${FRAME * 4 * ratio}px`;
            neko.style.left = `${nekoPosX - size / 2}px`;
            neko.style.top = `${nekoPosY - size / 2}px`;
        };

        const setSprite = (name, frame) => {
            const set = spriteSets[name] || spriteSets.idle;
            const sprite = set[frame % set.length];
            const size = frameSize();
            neko.style.backgroundPosition = `${sprite[0] * size}px ${sprite[1] * size}px`;
        };

        const resetIdle = () => {
            idleAnimation = null;
            idleAnimationFrame = 0;
        };

        const idle = () => {
            idleTime += 1;
            if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation === null) {
                const options = ["sleeping", "scratchSelf"];
                if (nekoPosX < 32) options.push("scratchWallW");
                if (nekoPosY < 32) options.push("scratchWallN");
                if (nekoPosX > window.innerWidth - 32) options.push("scratchWallE");
                if (nekoPosY > window.innerHeight - 32) options.push("scratchWallS");
                idleAnimation = options[Math.floor(Math.random() * options.length)];
            }
            switch (idleAnimation) {
                case "sleeping":
                    if (idleAnimationFrame < 8) {
                        setSprite("tired", 0);
                        break;
                    }
                    setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                    if (idleAnimationFrame > 192) resetIdle();
                    break;
                case "scratchWallN":
                case "scratchWallS":
                case "scratchWallE":
                case "scratchWallW":
                case "scratchSelf":
                    setSprite(idleAnimation, idleAnimationFrame);
                    if (idleAnimationFrame > 9) resetIdle();
                    break;
                default:
                    setSprite("idle", 0);
                    return;
            }
            idleAnimationFrame += 1;
        };

        const frame = () => {
            frameCount += 1;
            const speed = Math.max(4, Math.min(24, Number(settings.store.speed) || SPEED));
            const diffX = nekoPosX - mousePosX;
            const diffY = nekoPosY - mousePosY;
            const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

            if (distance < speed || distance < 48) {
                idle();
                return;
            }

            resetIdle();
            if (idleTime > 1) {
                setSprite("alert", 0);
                idleTime = Math.min(idleTime, 7) - 1;
                return;
            }

            let direction = "";
            direction += diffY / distance > 0.5 ? "N" : "";
            direction += diffY / distance < -0.5 ? "S" : "";
            direction += diffX / distance > 0.5 ? "W" : "";
            direction += diffX / distance < -0.5 ? "E" : "";
            setSprite(direction, frameCount);

            nekoPosX -= (diffX / distance) * speed;
            nekoPosY -= (diffY / distance) * speed;
            nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
            nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);
            place();
        };

        const onAnimationFrame = (timestamp) => {
            if (!neko.isConnected) return;
            if (!lastFrame) lastFrame = timestamp;
            if (timestamp - lastFrame > 100) {
                lastFrame = timestamp;
                frame();
            }
            raf = requestAnimationFrame(onAnimationFrame);
        };

        const onMove = (event) => {
            mousePosX = event.clientX;
            mousePosY = event.clientY;
        };

        document.addEventListener("mousemove", onMove);
        (document.body || document.documentElement).appendChild(neko);
        place();
        setSprite("idle", 0);
        raf = requestAnimationFrame(onAnimationFrame);

        const save = () => {
            if (!settings.store.persistPosition) return;
            stored.write({ nekoPosX, nekoPosY, mousePosX, mousePosY, frameCount, idleTime, idleAnimation, idleAnimationFrame });
        };
        window.addEventListener("beforeunload", save);

        ctx.cleanup(settings.onChange(() => {
            place();
            setSprite("idle", 0);
        }));
        ctx.cleanup(() => {
            save();
            if (raf) cancelAnimationFrame(raf);
            document.removeEventListener("mousemove", onMove);
            window.removeEventListener("beforeunload", save);
            neko.remove();
        });
        ctx.css(`
            .omniyap-oneko{position:fixed;pointer-events:none;z-index:2147483647;image-rendering:pixelated;
                background-repeat:no-repeat;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
        `);
    },
});
