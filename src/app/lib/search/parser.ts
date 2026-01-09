/**
 * FILE: src/app/lib/search/parser.ts
 *
 * This module parses the token stream for the query language into a boolean-expression AST. It is
 * a small recursive-descent parser with explicit precedence: unary NOT binds strongest, implicit
 * adjacency forms AND, and OR has the lowest precedence, with parentheses for grouping. The parser
 * does not perform database-aware escaping; it only constructs the AST and normalizes word tokens
 * via the shared sanitizer.
 */

import type { Tok } from "@/app/lib/search/tokenize";
import type { Node } from "@/app/lib/search/ast";
import { sanitizeWord } from "@/app/lib/search/ast";

export class Parser {
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
