/**
 * FILE: src/app/lib/search/tokenize.ts
 *
 * This module implements lexical analysis for the mini query language. It converts an input string
 * into a token stream with parentheses, OR, quoted phrases, and a boundary-sensitive unary minus
 * operator that acts as NOT. The tokenizer is whitespace-driven and does not allocate complex
 * intermediate objects beyond the token array, enabling the parser to remain a small deterministic
 * recursive-descent implementation.
 */

export type Tok =
    | { t: "WORD"; v: string }
    | { t: "PHRASE"; v: string }
    | { t: "OR" }
    | { t: "LP" }
    | { t: "RP" }
    | { t: "MINUS" };

function isWs(ch: string) {
    return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
}

function isUnaryMinusAt(s: string, i: number): boolean {
    if (s[i] !== "-") return false;
    const prev = i > 0 ? s[i - 1] : "";
    const next = i + 1 < s.length ? s[i + 1] : "";
    const boundary = i === 0 || isWs(prev) || prev === "(";
    const hasOperand = !!next && !isWs(next);
    return boundary && hasOperand;
}

export function tokenize(input: string): Tok[] {
    const s = input.trim();
    const out: Tok[] = [];
    let i = 0;

    while (i < s.length) {
        const ch = s[i];

        if (isWs(ch)) {
            i++;
            continue;
        }
        if (ch === "(") {
            out.push({ t: "LP" });
            i++;
            continue;
        }
        if (ch === ")") {
            out.push({ t: "RP" });
            i++;
            continue;
        }
        if (isUnaryMinusAt(s, i)) {
            out.push({ t: "MINUS" });
            i++;
            continue;
        }
        if (ch === '"') {
            let j = i + 1;
            while (j < s.length && s[j] !== '"') j++;
            const inner = s.slice(i + 1, j).replace(/"/g, "").trim();
            if (inner) out.push({ t: "PHRASE", v: inner });
            i = j < s.length ? j + 1 : j;
            continue;
        }

        let j = i;
        while (j < s.length && !isWs(s[j]) && s[j] !== "(" && s[j] !== ")" && s[j] !== '"') {
            if (s[j] === "-" && isUnaryMinusAt(s, j)) break;
            j++;
        }

        const raw = s.slice(i, j);
        if (raw === "OR" || raw === "|") out.push({ t: "OR" });
        else out.push({ t: "WORD", v: raw });

        i = j;
    }

    return out;
}
