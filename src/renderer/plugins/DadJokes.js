// Jokes come from icanhazdadjoke.com, the same API Vencord's DadJokes plugin uses. The local list
// below is only there for when the requests fail (offline, blocked network).
import { definePlugin } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const API = "https://icanhazdadjoke.com/";

const JOKES = [
    "I only know 25 letters of the alphabet. I don't know y.",
    "Why don't scientists trust atoms? Because they make up everything.",
    "I used to hate facial hair, but then it grew on me.",
    "What do you call a fake noodle? An impasta.",
    "Why did the scarecrow win an award? He was outstanding in his field.",
    "I'm reading a book about anti-gravity. It's impossible to put down.",
    "Why don't eggs tell jokes? They would crack each other up.",
    "What do you call a bear with no teeth? A gummy bear.",
    "I would tell you a construction joke, but I'm still working on it.",
    "Why did the coffee file a police report? It got mugged.",
    "How does a penguin build its house? Igloos it together.",
    "What do you call a sleeping bull? A bulldozer.",
    "Why did the math book look sad? Too many problems.",
    "What do you call cheese that isn't yours? Nacho cheese.",
    "Why can't you give Elsa a balloon? Because she will let it go.",
    "I told my wife she should embrace her mistakes. She hugged me.",
    "What did the ocean say to the beach? Nothing, it just waved.",
    "Why did the bicycle fall over? It was two-tired.",
    "How do you organise a party in space? You planet.",
    "Why did the golfer bring two pairs of trousers? In case he got a hole in one.",
];

export default definePlugin({
    name: "DadJokes",
    description: "Type /joke and the composer sends a random dad joke from icanhazdadjoke.com. Groaning is mandatory.",
    authors: [{ name: "OmniYap" }],
    tags: ["fun"],

    start(ctx) {
        let ready = null;
        let alive = true;

        const prefetch = async () => {
            try {
                const response = await fetch(API, { headers: { Accept: "application/json" } });
                if (!response.ok) return;
                const joke = (await response.json())?.joke;
                if (alive && typeof joke === "string" && joke.trim()) ready = joke.trim().replace(/\s+/g, " ");
            } catch {
                // Offline or blocked: the local list takes over.
            }
        };
        prefetch();
        ctx.cleanup(() => {
            alive = false;
            ready = null;
        });

        ctx.cleanup(interceptSend((text) => {
            if (!/^\/joke$/i.test(String(text).trim())) return text;
            const joke = ready;
            ready = null;
            prefetch();
            return joke || JOKES[Math.floor(Math.random() * JOKES.length)];
        }));
    },
});
