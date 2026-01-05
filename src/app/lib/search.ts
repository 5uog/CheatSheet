// FILE: src/lib/search.ts
export type ParsedQuery =
    | { kind: "empty" }
    | { kind: "exact"; body: string }
    | { kind: "fts"; match: string }
    | { kind: "like"; where: string; params: string[] };

type Tok =
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
    // Treat '-' as unary NOT only when it appears at a token boundary:
    // - at start, or after whitespace, or after '('
    // and it is followed by a non-whitespace character.
    if (s[i] !== "-") return false;
    const prev = i > 0 ? s[i - 1] : "";
    const next = i + 1 < s.length ? s[i + 1] : "";
    const boundary = i === 0 || isWs(prev) || prev === "(";
    const hasOperand = !!next && !isWs(next);
    return boundary && hasOperand;
}

function tokenize(input: string): Tok[] {
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
        // IMPORTANT: allow '-' inside words (e.g., "full-text")
        while (j < s.length && !isWs(s[j]) && s[j] !== "(" && s[j] !== ")" && s[j] !== '"') {
            // Stop token before unary '-' only if it is at boundary (handled on next loop)
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

type Node =
    | { k: "TERM"; text: string; phrase: boolean; wildcard: boolean }
    | { k: "NOT"; inner: Node }
    | { k: "AND"; items: Node[] }
    | { k: "OR"; items: Node[] };

class Parser {
    private idx = 0;
    constructor(private toks: Tok[]) {}

    private peek(): Tok | null {
        return this.idx < this.toks.length ? this.toks[this.idx] : null;
    }
    private eat(): Tok | null {
        const t = this.peek();
        if (t) this.idx++;
        return t;
    }

    parseExpr(): Node | null {
        if (this.toks.length === 0) return null;
        return this.parseOr();
    }

    private parseOr(): Node | null {
        const first = this.parseAnd();
        if (!first) return null;

        const items: Node[] = [first];
        while (true) {
            const p = this.peek();
            if (!p || p.t !== "OR") break;
            this.eat();
            const right = this.parseAnd();
            if (!right) break;
            items.push(right);
        }
        return items.length === 1 ? items[0] : { k: "OR", items };
    }

    private parseAnd(): Node | null {
        const items: Node[] = [];
        while (true) {
            const p = this.peek();
            if (!p || p.t === "OR" || p.t === "RP") break;
            const u = this.parseUnary();
            if (!u) break;
            items.push(u);
        }
        if (items.length === 0) return null;
        return items.length === 1 ? items[0] : { k: "AND", items };
    }

    private parseUnary(): Node | null {
        const p = this.peek();
        if (p && p.t === "MINUS") {
            this.eat();
            const inner = this.parseUnary();
            if (!inner) return null;
            return { k: "NOT", inner };
        }
        return this.parsePrimary();
    }

    private parsePrimary(): Node | null {
        const p = this.peek();
        if (!p) return null;

        if (p.t === "LP") {
            this.eat();
            const e = this.parseExpr();
            const r = this.peek();
            if (r && r.t === "RP") this.eat();
            return e;
        }

        if (p.t === "PHRASE") {
            this.eat();
            const inner = p.v.trim();
            if (!inner) return null;
            return { k: "TERM", text: inner, phrase: true, wildcard: false };
        }

        if (p.t === "WORD") {
            this.eat();
            const term = sanitizeWord(p.v);
            if (!term.text) return null;
            return { k: "TERM", text: term.text, phrase: term.phrase, wildcard: term.wildcard };
        }

        return null;
    }
}

function sanitizeWord(w: string): { text: string; phrase: boolean; wildcard: boolean } {
    const raw = (w ?? "").trim();
    if (!raw) return { text: "", phrase: false, wildcard: false };

    const wildcard = raw.endsWith("*") && raw.length > 1;
    const core = wildcard ? raw.slice(0, -1) : raw;

    // keep multi-script and symbols; only remove control chars and surrounding quotes
    const cleaned = core.replace(/[\u0000-\u001F\u007F]/g, "").replace(/^"+|"+$/g, "").trim();
    if (!cleaned) return { text: "", phrase: false, wildcard: false };

    // If it contains spaces, treat it as phrase-like term (we'll quote it in FTS)
    const phrase = /\s/.test(cleaned);

    return { text: wildcard ? `${cleaned}*` : cleaned, phrase, wildcard };
}

function escapeFtsPhrase(s: string): string {
    // FTS5: escape " inside phrase by doubling it
    return s.replace(/"/g, `""`);
}

function needsQuotingForFts(token: string): boolean {
    // Quote if it contains characters that may confuse FTS query parser.
    // Allow common safe set and a terminal '*' wildcard.
    const t = token.endsWith("*") ? token.slice(0, -1) : token;
    if (!t) return true;
    // safe: letters, numbers, underscore, hyphen, and Japanese scripts; everything else -> quote
    return /[^\p{L}\p{N}_\-]/u.test(t);
}

function toFts(node: Node): string {
    switch (node.k) {
        case "TERM": {
            if (node.phrase) return `"${escapeFtsPhrase(node.text)}"`;
            if (needsQuotingForFts(node.text)) return `"${escapeFtsPhrase(node.text)}"`;
            return node.text;
        }
        case "NOT":
            return `NOT ${wrap(node.inner)}`;
        case "AND":
            return node.items.map(wrap).join(" ");
        case "OR":
            return node.items.map(wrap).join(" OR ");
    }
}

function wrap(n: Node): string {
    if (n.k === "TERM" || n.k === "NOT") return toFts(n);
    return `(${toFts(n)})`;
}

function escapeLikeLiteral(s: string): string {
    // escape backslash first, then LIKE wildcards
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toLike(node: Node, params: string[]): string {
    switch (node.k) {
        case "TERM": {
            const t = node.text;

            if (!node.phrase && t.endsWith("*")) {
                const p = t.slice(0, -1);
                params.push(`${escapeLikeLiteral(p)}%`);
                return `body LIKE ? ESCAPE '\\'`;
            }

            params.push(`%${escapeLikeLiteral(t)}%`);
            return `body LIKE ? ESCAPE '\\'`;
        }
        case "NOT":
            return `NOT (${toLike(node.inner, params)})`;
        case "AND":
            return node.items.map((x) => `(${toLike(x, params)})`).join(" AND ");
        case "OR":
            return node.items.map((x) => `(${toLike(x, params)})`).join(" OR ");
    }
}

export function parseQuery(input: string): ParsedQuery {
    const q = (input ?? "").trim();
    if (!q) return { kind: "empty" };

    // exact match (full body)
    if (q.startsWith("=")) {
        const body = q.slice(1).trim();
        if (!body) return { kind: "empty" };
        return { kind: "exact", body };
    }

    // explicit LIKE mode (useful for extremely short terms / symbols)
    if (q.startsWith("~")) {
        const rest = q.slice(1).trim();
        if (!rest) return { kind: "empty" };
        const toks = tokenize(rest);
        const ast = new Parser(toks).parseExpr();
        if (!ast) return { kind: "empty" };
        const params: string[] = [];
        const where = toLike(ast, params).trim();
        if (!where) return { kind: "empty" };
        return { kind: "like", where, params };
    }

    const toks = tokenize(q);
    const ast = new Parser(toks).parseExpr();
    if (!ast) return { kind: "empty" };

    const match = toFts(ast).trim();
    if (!match) return { kind: "empty" };

    return { kind: "fts", match };
}
