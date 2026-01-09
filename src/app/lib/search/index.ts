/**
 * FILE: src/app/lib/search/index.ts
 *
 * This module is the stable public entrypoint for the search query subsystem. It re-exports the
 * core parser, the policy wrapper that can apply tokenizer-dependent fallbacks, and the public
 * result types. Callers import from this path to avoid coupling to internal file layout while the
 * package continues to evolve.
 */

export type { ParsedQuery } from "@/app/lib/search/types";
export { parseQuery } from "@/app/lib/search/parse-query";
export type { Tokenizer } from "@/app/lib/search/parse-search";
export { parseSearch, shouldAutoFallbackToLike } from "@/app/lib/search/parse-search";
