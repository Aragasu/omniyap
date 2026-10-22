import { definePlugin } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const COMPLIMENTS = [
    "has the kind of laugh that makes a bad day better.",
    "gives advice like someone who has actually listened.",
    "is the reason at least one group chat is still fun.",
    "has impeccable taste in profile pictures.",
    "makes complicated things sound simple, which is a rare skill.",
    "is reliably kind when nobody is watching.",
    "could make a queue feel like a conversation.",
    "has the best timing in this entire server.",
    "deserves more credit than they get.",
    "brings exactly the right energy to the room.",
    "asks the question everyone else was thinking.",
    "remembers the small things about people.",
    "writes messages that are worth reading twice.",
    "is dangerously good at being right.",
    "makes this place less boring just by showing up.",
];

export default definePlugin({
    name: "ComplimentBot",
    description: "Type /compliment @person to send them a randomly chosen, genuinely nice compliment from a local list.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun", "people"],

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            const match = /^\/compliment(?:\s+(\S+))?$/i.exec(String(text).trim());
            if (!match) return text;
            const target = match[1] ? match[1].replace(/^@/, "@") : null;
            const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
            return target ? `${target} ${compliment}` : `You ${compliment}`;
        }));
    },
});
