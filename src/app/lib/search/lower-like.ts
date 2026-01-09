/**
 * FILE: src/app/lib/search/lower-like.ts
 *
 * This module lowers the query AST into a parameterized SQL LIKE predicate over the questions body
 * column. It escapes LIKE wildcard metacharacters so user-provided text is treated as data, and it
 * returns the generated WHERE fragment alongside an ordered parameter array suitable for prepared
 * statements. Prefix search is supported by interpreting a terminal '*' on non-phrase terms as a
 * SQL '%' suffix.
 */

import type { Node } from "@/app/lib/search/ast";

function escapeLikeLiteral(s: string): string {
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

export function lowerToLike(ast: Node): { where: string; params: string[] } {
    const params: string[] = [];
    const where = toLike(ast, params).trim();
    return { where, params };
}
