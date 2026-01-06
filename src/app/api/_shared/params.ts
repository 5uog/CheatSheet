/**
 * FILE: src/app/api/_shared/params.ts
 *
 * This module normalizes Next.js route handler parameter delivery into a single awaited shape.
 * Some handlers receive a plain params object while others receive a promise that resolves to it;
 * this helper collapses both cases so downstream utilities can remain simple and type-directed.
 *
 * The function performs transport-level validation that the materialized params map is an object
 * whose values are strings. If the input is malformed, it returns an empty object rather than
 * throwing, allowing callers to deterministically treat missing or invalid params as "not found"
 * or "bad request" depending on their own policy.
 */

export type ParamsLike<T extends Record<string, string>> = { params: T } | { params: Promise<T> };

function isStringRecord(x: unknown): x is Record<string, string> {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    for (const k of Object.keys(o)) {
        if (typeof o[k] !== "string") return false;
    }
    return true;
}

export async function readParams<T extends Record<string, string>>(ctx: ParamsLike<T>): Promise<T> {
    const p0 = (ctx as { params: unknown }).params;
    const p = p0 instanceof Promise ? await p0 : p0;

    if (isStringRecord(p)) return p as T;

    return {} as T;
}
