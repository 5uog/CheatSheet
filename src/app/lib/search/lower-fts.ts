/**
 * FILE: src/app/lib/search/lower-fts.ts
 *
 * This module lowers the query AST into an FTS5 MATCH expression. It emits quoted phrases when the
 * term is explicitly a phrase or when the token contains characters that would be ambiguous in the
 * FTS5 query grammar, and it doubles embedded quotes to satisfy FTS5 string literal rules. Boolean
 * structure is preserved by inserting parentheses around composite subexpressions and by rendering
 * unary negation via the FTS5 NOT operator.
 */

import type { Node } from "@/app/lib/search/ast";

function escapeFtsPhrase(s: string): string {
    return s.replace(/"/g, `""`);
}

function needsQuotingForFts(token: string): boolean {
    const t = token.endsWith("*") ? token.slice(0, -1) : token;
    if (!t) return true;
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

export function lowerToFtsMatch(ast: Node): string {
    return toFts(ast).trim();
}
