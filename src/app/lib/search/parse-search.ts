/**
 * FILE: src/app/lib/search/parse-search.ts
 *
 * This module provides the policy-layer wrapper around the core parser, implementing an automatic
 * fallback from FTS to LIKE for short tokens when the trigram tokenizer is in use. The heuristic is
 * conservative and only activates for unprefixed queries, allowing callers to override behavior via
 * explicit '=' and '~' prefixes while preserving a stable caller contract that includes a fallback
 * indicator.
 */

import { parseQuery } from "@/app/lib/search/parse-query";
import type { ParsedQuery } from "@/app/lib/search/types";

export type Tokenizer = "trigram" | "unicode61";

export function shouldAutoFallbackToLike(originalQ: string, tokenizer: Tokenizer): boolean {
    const q = (originalQ ?? "").trim();
    if (!q) return false;

    if (q.startsWith("=") || q.startsWith("~")) return false;
    if (tokenizer !== "trigram") return false;

    const tokens: string[] = [];

    const phraseRe = /"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = phraseRe.exec(q)) !== null) {
        const inner = (m[1] ?? "").trim();
        if (inner) tokens.push(inner);
    }

    const qNoPhrases = q.replace(/"([^"]*)"/g, " ").trim();
    const rawParts = qNoPhrases.split(/\s+/).filter(Boolean);

    for (const part of rawParts) {
        if (part === "OR" || part === "|") continue;
        if (part === "(" || part === ")") continue;

        const t0 = part.startsWith("-") ? part.slice(1) : part;
        if (!t0) continue;

        const t1 = t0.replace(/^[()]+|[()]+$/g, "");
        if (!t1) continue;

        tokens.push(t1);
    }

    for (const tok of tokens) {
        const t = tok.endsWith("*") ? tok.slice(0, -1) : tok;
        const clean = t.trim();
        if (!clean) continue;
        if (clean.length < 3) return true;
    }

    return false;
}

export function parseSearch(
    q: string,
    opts: { tokenizer: Tokenizer }
): (ParsedQuery & { autoFallback: boolean }) | ({ kind: "empty" } & { autoFallback: boolean }) {
    if (shouldAutoFallbackToLike(q, opts.tokenizer)) {
        const likeParsed = parseQuery(`~${q}`);
        if (likeParsed.kind === "like") {
            return { ...likeParsed, autoFallback: true as const };
        }
    }
    const parsed = parseQuery(q);
    return { ...parsed, autoFallback: false as const };
}
