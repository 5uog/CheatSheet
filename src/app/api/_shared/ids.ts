/**
 * FILE: src/app/api/_shared/ids.ts
 *
 * This module provides a small, transport-facing utility for decoding positive integer identifiers
 * that arrive as route parameters. It separates the syntactic check (digits-only, safe integer)
 * from the parameter source abstraction, allowing route handlers to remain agnostic to whether
 * Next.js supplies params eagerly or as a promise. The result is a narrow, stable API that returns
 * either a validated positive integer or null, enabling deterministic 400 handling without throwing.
 */

import { readParams, type ParamsLike } from "@/app/api/_shared/params";

export function parsePositiveIntId(raw: unknown): number | null {
    const s = String(raw ?? "").trim();
    if (!/^\d+$/.test(s)) return null;

    const n = Number(s);
    if (!Number.isSafeInteger(n) || n <= 0) return null;

    return n;
}

export async function readPositiveIntId<T extends Record<string, string>>(
    ctx: ParamsLike<T>,
    key: keyof T
): Promise<number | null> {
    const p = await readParams(ctx);
    return parsePositiveIntId(p[key]);
}
