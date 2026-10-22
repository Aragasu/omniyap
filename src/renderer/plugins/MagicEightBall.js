import { definePlugin } from "../core/api.js";
import { interceptSend } from "./_shared.js";

// The twenty answers printed in the classic Magic 8-Ball.
const ANSWERS = [
    "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely.", "You may rely on it.",
    "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
    "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.",
    "Concentrate and ask again.", "Do not count on it.", "My reply is no.", "My sources say no.",
    "Outlook not so good.", "Very doubtful.",
];

export default definePlugin({
    name: "MagicEightBall",
    description: "Ask the magic 8-ball anything with /8ball and the composer turns your question into a random answer.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun"],

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            const match = /^\/8ball\s+(.+)$/i.exec(String(text).trim());
            if (!match) return text;
            const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
            return `🎱 ${match[1].trim()}\n**${answer}**`;
        }));
    },
});
