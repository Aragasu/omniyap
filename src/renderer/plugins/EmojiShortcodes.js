import { definePlugin, definePluginSettings, OptionType, store } from "../core/api.js";
import { h, getComposer, setNativeValue, interceptSend } from "./_shared.js";

// A compact shortcode table. Names are matched case-insensitively and :name: is replaced on send.
const CODES = {
    smile: "😄", smiley: "😃", grin: "😁", laughing: "😆", joy: "😂", rofl: "🤣", wink: "😉",
    blush: "😊", heart_eyes: "😍", kissing_heart: "😘", yum: "😋", sunglasses: "😎", thinking: "🤔",
    neutral_face: "😐", expressionless: "😑", unamused: "😒", roll_eyes: "🙄", smirk: "😏",
    sweat_smile: "😅", sob: "😭", cry: "😢", angry: "😠", rage: "😡", scream: "😱", fearful: "😨",
    sleepy: "😪", sleeping: "😴", mask: "😷", nerd: "🤓", cowboy: "🤠", clown: "🤡", ghost: "👻",
    skull: "💀", alien: "👽", robot: "🤖", poop: "💩", fire: "🔥", sparkles: "✨", star: "⭐",
    star2: "🌟", zap: "⚡", boom: "💥", hearts: "💕", heart: "❤️", broken_heart: "💔",
    blue_heart: "💙", green_heart: "💚", yellow_heart: "💛", purple_heart: "💜", orange_heart: "🧡",
    black_heart: "🖤", white_heart: "🤍", two_hearts: "💞", sparkling_heart: "💖", thumbsup: "👍",
    "+1": "👍", thumbsdown: "👎", "-1": "👎", clap: "👏", pray: "🙏", wave: "👋", ok_hand: "👌",
    v: "✌️", peace: "✌️", muscle: "💪", point_right: "👉", point_left: "👈", point_up: "☝️",
    eyes: "👀", brain: "🧠", ear: "👂", nose: "👃", tongue: "👅", lips: "👄", baby: "👶",
    man: "👨", woman: "👩", person: "🧑", couple: "👫", dance: "💃", tada: "🎉", confetti: "🎊",
    gift: "🎁", balloon: "🎈", cake: "🎂", cookie: "🍪", pizza: "🍕", burger: "🍔", fries: "🍟",
    coffee: "☕", tea: "🍵", beer: "🍺", beers: "🍻", wine: "🍷", milk: "🥛", water: "💧",
    apple: "🍎", banana: "🍌", watermelon: "🍉", strawberry: "🍓", cherry: "🍒", lemon: "🍋",
    avocado: "🥑", bread: "🍞", cheese: "🧀", egg: "🥚", taco: "🌮", sushi: "🍣", ramen: "🍜",
    dog: "🐶", cat: "🐱", mouse: "🐭", hamster: "🐹", rabbit: "🐰", fox: "🦊", bear: "🐻",
    panda: "🐼", koala: "🐨", tiger: "🐯", lion: "🦁", cow: "🐮", pig: "🐷", frog: "🐸",
    monkey: "🐵", chicken: "🐔", penguin: "🐧", bird: "🐦", duck: "🦆", owl: "🦉", unicorn: "🦄",
    bee: "🐝", butterfly: "🦋", snail: "🐌", snake: "🐍", dragon: "🐉", whale: "🐳", dolphin: "🐬",
    fish: "🐟", octopus: "🐙", crab: "🦀", shrimp: "🦐", squid: "🦑", turtle: "🐢", dino: "🦖",
    tree: "🌳", palm_tree: "🌴", cactus: "🌵", rose: "🌹", sunflower: "🌻", tulip: "🌷",
    cherry_blossom: "🌸", four_leaf_clover: "🍀", maple_leaf: "🍁", leaf: "🍃", mushroom: "🍄",
    sun: "☀️", moon: "🌙", cloud: "☁️", rain: "🌧️", snowflake: "❄️", snowman: "⛄", rainbow: "🌈",
    umbrella: "☔", earth: "🌍", globe: "🌐", rocket: "🚀", airplane: "✈️", car: "🚗", bus: "🚌",
    train: "🚆", bike: "🚲", ship: "🚢", anchor: "⚓", hourglass: "⌛", alarm_clock: "⏰",
    watch: "⌚", calendar: "📅", memo: "📝", pencil: "✏️", book: "📖", books: "📚", bulb: "💡",
    lock: "🔒", unlock: "🔓", key: "🔑", hammer: "🔨", wrench: "🔧", gear: "⚙️", bomb: "💣",
    knife: "🔪", shield: "🛡️", crown: "👑", gem: "💎", money: "💰", dollar: "💵", credit_card: "💳",
    trophy: "🏆", medal: "🏅", soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾",
    tennis: "🎾", volleyball: "🏐", dice: "🎲", video_game: "🎮", joystick: "🕹️", guitar: "🎸",
    drum: "🥁", mic: "🎤", headphones: "🎧", music: "🎵", notes: "🎶", movie: "🎬", camera: "📷",
    phone: "📱", computer: "💻", keyboard: "⌨️", tv: "📺", megaphone: "📣", bell: "🔔",
    no_bell: "🔕", email: "📧", package: "📦", trash: "🗑️", check: "✅", x: "❌", warning: "⚠️",
    question: "❓", exclamation: "❗", hundred: "💯", infinity: "♾️", arrow_up: "⬆️",
    arrow_down: "⬇️", arrow_left: "⬅️", arrow_right: "➡️", recycle: "♻️", peace_symbol: "☮️",
};

const settings = definePluginSettings({
    popup: { type: OptionType.BOOLEAN, description: "Show suggestions while you type a :shortcode:.", default: true },
    replaceOnSend: { type: OptionType.BOOLEAN, description: "Replace :shortcode: with the emoji when sending.", default: true },
});

function serverEmojiNames() {
    const raw = store.getState()?.emojis;
    const names = [];
    if (Array.isArray(raw)) {
        for (const emoji of raw) if (emoji?.name) names.push(String(emoji.name).toLowerCase());
    } else if (raw && typeof raw === "object") {
        for (const value of Object.values(raw)) if (value?.name) names.push(String(value.name).toLowerCase());
    }
    return names;
}

export default definePlugin({
    name: "EmojiShortcodes",
    description: "Type :shortcode: in the composer to get an emoji suggestion, Discord and Slack style. Exact codes are also expanded when you send.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "emoji", "utility"],
    settings,

    start(ctx) {
        let popup = null;
        let matches = [];
        let selected = 0;
        let token = null;
        let custom = [];

        const build = () => {
            custom = [...new Set(serverEmojiNames())];
            return Object.entries(CODES).map(([name, emoji]) => ({ name, emoji }));
        };
        let entries = build();

        const close = () => {
            popup?.remove();
            popup = null;
            matches = [];
            token = null;
        };

        const apply = (composer, entry) => {
            if (!token) return;
            const value = composer.value;
            const next = value.slice(0, token.start) + entry.emoji + " " + value.slice(token.end);
            setNativeValue(composer, next);
            const caret = token.start + entry.emoji.length + 1;
            composer.focus();
            composer.setSelectionRange?.(caret, caret);
            close();
        };

        const render = (composer) => {
            if (!popup) {
                popup = h("div", { class: "omniyap-sc-pop", role: "listbox", "aria-label": "Emoji suggestions" });
                document.body.appendChild(popup);
                popup.addEventListener("mousedown", (event) => {
                    const button = event.target instanceof Element ? event.target.closest("button[data-index]") : null;
                    if (!button) return;
                    event.preventDefault();
                    const entry = matches[Number(button.dataset.index)];
                    if (entry) apply(composer, entry);
                });
            }
            const rect = composer.getBoundingClientRect();
            popup.style.left = `${Math.max(8, Math.min(window.innerWidth - 260, rect.left + 10))}px`;
            popup.style.top = `${Math.max(8, rect.top - Math.min(300, matches.length * 34 + 40))}px`;
            popup.replaceChildren(
                h("div", { class: "omniyap-sc-head" }, "Emoji"),
                ...matches.map((entry, index) => h("button", {
                    type: "button",
                    class: "omniyap-sc-item" + (index === selected ? " active" : ""),
                    "data-index": index,
                    role: "option",
                    "aria-selected": String(index === selected),
                },
                    h("span", { class: "omniyap-sc-emoji" }, entry.emoji),
                    h("span", { class: "omniyap-sc-name" }, `:${entry.name}:`),
                )),
                h("div", { class: "omniyap-sc-foot" }, "Tab or Enter to insert"),
            );
        };

        const update = () => {
            const composer = getComposer();
            if (!composer) return close();
            if (!settings.store.popup) return close();
            const caret = composer.selectionStart ?? composer.value.length;
            const before = composer.value.slice(0, caret);
            const match = /(^|[\s([{"]):([a-z0-9_+-]{1,32})$/i.exec(before);
            if (!match) return close();
            const query = match[2].toLowerCase();
            const all = entries.filter((entry) => !custom.includes(entry.name));
            const found = all
                .filter((entry) => entry.name.startsWith(query))
                .sort((a, b) => a.name.length - b.name.length)
                .slice(0, 8);
            if (!found.length) return close();
            matches = found;
            if (selected >= matches.length) selected = 0;
            token = { start: caret - match[2].length - 1, end: caret };
            render(composer);
        };

        const onInput = (event) => {
            if (event.target !== getComposer()) return;
            selected = 0;
            update();
        };

        const onKey = (event) => {
            const composer = getComposer();
            if (!composer || event.target !== composer || !popup) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                event.stopPropagation();
                selected = (selected + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
                render(composer);
            } else if (event.key === "Tab" || event.key === "Enter") {
                if (!matches[selected]) return;
                event.preventDefault();
                event.stopPropagation();
                apply(composer, matches[selected]);
            }
        };

        document.addEventListener("input", onInput, true);
        document.addEventListener("keydown", onKey, true);
        ctx.cleanup(() => {
            document.removeEventListener("input", onInput, true);
            document.removeEventListener("keydown", onKey, true);
            close();
        });

        if (settings.store.replaceOnSend) {
            ctx.cleanup(interceptSend((text) => text.replace(/:([a-z0-9_+-]+):/gi, (whole, name) => CODES[String(name).toLowerCase()] || whole)));
        }

        ctx.css(`
            .omniyap-sc-pop{position:fixed;z-index:2147483100;width:244px;max-height:310px;overflow:auto;background:#1b1b26;
                border:1px solid rgba(255,255,255,.1);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:5px}
            .omniyap-sc-head{font:700 10px Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:#7c7f8c;padding:5px 8px}
            .omniyap-sc-item{display:flex;align-items:center;gap:9px;width:100%;border:0;background:transparent;color:#d9dae0;
                border-radius:7px;padding:6px 8px;cursor:pointer;text-align:left;font:500 12.5px Inter,system-ui,sans-serif}
            .omniyap-sc-item.active,.omniyap-sc-item:hover{background:rgba(139,57,253,.22)}
            .omniyap-sc-emoji{font-size:17px;line-height:1}
            .omniyap-sc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .omniyap-sc-foot{font:500 10px Inter,system-ui,sans-serif;color:#666977;padding:6px 8px 3px;border-top:1px solid rgba(255,255,255,.05);margin-top:3px}
        `);
        entries = build();
    },
});
