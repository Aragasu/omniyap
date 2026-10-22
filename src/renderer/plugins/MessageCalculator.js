import { definePlugin, definePluginSettings, OptionType } from "../core/api.js";
import { interceptSend } from "./_shared.js";

const settings = definePluginSettings({
    echo: { type: OptionType.BOOLEAN, description: "Include the expression before the result.", default: true },
});

function tokenize(source) {
    const tokens = [];
    const text = String(source).replace(/\s+/g, "");
    let index = 0;
    while (index < text.length) {
        const rest = text.slice(index);
        const number = /^\d+(?:\.\d+)?|^\.\d+/.exec(rest);
        if (number) {
            tokens.push(Number(number[0]));
            index += number[0].length;
            continue;
        }
        const operator = /^[+\-*/%^()]/.exec(rest);
        if (operator) {
            tokens.push(operator[0]);
            index += 1;
            continue;
        }
        return null;
    }
    return tokens;
}

/** A tiny arithmetic parser: numbers, + - * / % ^, parentheses and unary signs. No eval. */
function evaluate(source) {
    const tokens = tokenize(source);
    if (!tokens || !tokens.length) return null;
    let position = 0;
    const peek = () => tokens[position];
    const take = (expected) => {
        if (tokens[position] !== expected) return false;
        position++;
        return true;
    };
    const parseExpression = () => {
        let value = parseTerm();
        while (peek() === "+" || peek() === "-") {
            const op = tokens[position++];
            const right = parseTerm();
            value = op === "+" ? value + right : value - right;
        }
        return value;
    };
    const parseTerm = () => {
        let value = parsePower();
        while (peek() === "*" || peek() === "/" || peek() === "%") {
            const op = tokens[position++];
            const right = parsePower();
            if (op === "*") value *= right;
            else if (op === "/") value /= right;
            else value %= right;
        }
        return value;
    };
    const parsePower = () => {
        let value = parseUnary();
        if (peek() === "^") {
            position++;
            value = Math.pow(value, parsePower());
        }
        return value;
    };
    const parseUnary = () => {
        if (peek() === "-") {
            position++;
            return -parseUnary();
        }
        if (peek() === "+") {
            position++;
            return parseUnary();
        }
        return parseAtom();
    };
    const parseAtom = () => {
        if (take("(")) {
            const value = parseExpression();
            if (!take(")")) throw new Error("missing )");
            return value;
        }
        const token = tokens[position];
        if (typeof token !== "number") throw new Error("expected a number");
        position++;
        return token;
    };
    try {
        const value = parseExpression();
        if (position !== tokens.length || !Number.isFinite(value)) return null;
        return Number(value.toFixed(10));
    } catch {
        return null;
    }
}

export default definePlugin({
    name: "MessageCalculator",
    description: "Type =2*(3+4) in the composer and it sends the result. Arithmetic only, evaluated locally, never on a server.",
    authors: [{ name: "OmniYap" }],
    tags: ["chat", "utility"],
    settings,

    start(ctx) {
        ctx.cleanup(interceptSend((text) => {
            const trimmed = String(text).trim();
            if (!trimmed.startsWith("=") || trimmed.startsWith("==") || trimmed.length < 2) return text;
            const expression = trimmed.slice(1).trim();
            const value = evaluate(expression);
            if (value == null) {
                ctx.toast("That does not look like arithmetic", { type: "error", duration: 2500 });
                return text;
            }
            return settings.store.echo ? `${expression} = ${value}` : String(value);
        }));
    },
});
