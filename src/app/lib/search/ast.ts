/**
 * FILE: src/app/lib/search/ast.ts
 *
 * This module defines the boolean-expression AST used by the query subsystem and provides the
 * canonical normalization routine for unquoted term tokens. It classifies a token as a phrase when
 * whitespace remains after control-character stripping and quote trimming, and it preserves a
 * trailing wildcard marker by rewriting a terminal '*' into the normalized output form. No I/O is
 * performed here; the exports are pure data-shape definitions and deterministic string transforms
 * intended to be shared across parsers and lowering backends.
 */

export type Node =
    | { k: "TERM"; text: string; phrase: boolean; wildcard: boolean }
    | { k: "NOT"; inner: Node }
    | { k: "AND"; items: Node[] }
    | { k: "OR"; items: Node[] };

export function sanitizeWord(w: string): { text: string; phrase: boolean; wildcard: boolean } {
    const raw = (w ?? "").trim();
    if (!raw) return { text: "", phrase: false, wildcard: false };

    const wildcard = raw.endsWith("*") && raw.length > 1;
    const core = wildcard ? raw.slice(0, -1) : raw;

    const cleaned = core.replace(/[\u0000-\u001F\u007F]/g, "").replace(/^"+|"+$/g, "").trim();
    if (!cleaned) return { text: "", phrase: false, wildcard: false };

    const phrase = /\s/.test(cleaned);

    return { text: wildcard ? `${cleaned}*` : cleaned, phrase, wildcard };
}
