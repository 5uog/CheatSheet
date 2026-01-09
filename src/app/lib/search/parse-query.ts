/**
 * FILE: src/app/lib/search/parse-query.ts
 *
 * This module defines the top-level query parser entrypoint used by callers. It recognizes two
 * explicit prefixes: '=' for exact body equality and '~' for LIKE-based evaluation; all other
 * inputs are parsed and lowered into an FTS5 MATCH expression. Empty or syntactically degenerate
 * inputs return an explicit empty result rather than throwing, enabling route handlers to decide
 * how to combine query semantics with other filters.
 */

import type { ParsedQuery } from "@/app/lib/search/types";
import { tokenize } from "@/app/lib/search/tokenize";
import { Parser } from "@/app/lib/search/parser";
import { lowerToFtsMatch } from "@/app/lib/search/lower-fts";
import { lowerToLike } from "@/app/lib/search/lower-like";

export function parseQuery(input: string): ParsedQuery {
    const q = (input ?? "").trim();
    if (!q) return { kind: "empty" };

    if (q.startsWith("=")) {
        const body = q.slice(1).trim();
        if (!body) return { kind: "empty" };
        return { kind: "exact", body };
    }

    if (q.startsWith("~")) {
        const rest = q.slice(1).trim();
        if (!rest) return { kind: "empty" };

        const toks = tokenize(rest);
        const ast = new Parser(toks).parseExpr();
        if (!ast) return { kind: "empty" };

        const { where, params } = lowerToLike(ast);
        if (!where) return { kind: "empty" };

        return { kind: "like", where, params };
    }

    const toks = tokenize(q);
    const ast = new Parser(toks).parseExpr();
    if (!ast) return { kind: "empty" };

    const match = lowerToFtsMatch(ast);
    if (!match) return { kind: "empty" };

    return { kind: "fts", match };
}
