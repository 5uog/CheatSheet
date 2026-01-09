/**
 * FILE: src/app/lib/search/types.ts
 *
 * This module defines the public result shape produced by the query parser. The union encodes the
 * caller-visible execution strategy, distinguishing empty input, exact body equality, FTS5 MATCH
 * usage, and parameterized LIKE predicates. The types are intentionally transport-neutral so both
 * API handlers and repository code can consume parser output without relying on exceptions or
 * sentinel strings.
 */

export type ParsedQuery =
    | { kind: "empty" }
    | { kind: "exact"; body: string }
    | { kind: "fts"; match: string }
    | { kind: "like"; where: string; params: string[] };
