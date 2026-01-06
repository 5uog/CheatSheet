/**
 * FILE: src/app/api/_shared/http.ts
 *
 * This module centralizes JSON response construction for Next.js route handlers and applies a 
 * no-store caching posture by default. It composes response headers by first setting a fixed set of 
 * cache-bypass directives and then applying caller-provided headers as an override layer, ensuring 
 * that policy defaults are consistent while still allowing per-route specialization. It also 
 * contains a stable mapping from JSON body read failures to deterministic 400-class payload details, 
 * eliminating duplicated error-shaping logic in individual route modules.
 */

import { NextResponse } from "next/server";
import type { ReadJsonBodyResult } from "@/app/api/_shared/body";

export const NO_STORE_HEADERS = {
    "cache-control": "no-store, no-cache, must-revalidate",
    pragma: "no-cache",
    expires: "0",
} as const;

function toHeaders(init?: HeadersInit): Headers {
    if (!init) return new Headers();
    return init instanceof Headers ? new Headers(init) : new Headers(init);
}

function mergeNoStoreHeaders(extra?: HeadersInit): Headers {
    const h = new Headers();
    for (const [k, v] of Object.entries(NO_STORE_HEADERS)) h.set(k, v);
    const ex = toHeaders(extra);
    ex.forEach((v, k) => h.set(k, v));
    return h;
}

export function jsonOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
    return NextResponse.json(data, {
        status: init?.status ?? 200,
        headers: mergeNoStoreHeaders(init?.headers),
    });
}

export function jsonError(
    status: number,
    payload: { error: string; details?: unknown },
    init?: { headers?: HeadersInit }
) {
    return NextResponse.json(payload, {
        status,
        headers: mergeNoStoreHeaders(init?.headers),
    });
}

export function jsonInvalidPayload(details: unknown, init?: { headers?: HeadersInit }) {
    return jsonError(400, { error: "invalid payload", details }, init);
}

export function invalidPayloadDetailsFromBodyRead(br: Extract<ReadJsonBodyResult<unknown>, { ok: false }>): {
    body: "too large" | "empty" | "invalid json";
} {
    if (br.error === "too_large") return { body: "too large" };
    if (br.error === "empty") return { body: "empty" };
    return { body: "invalid json" };
}

export function jsonInvalidPayloadFromBodyRead(
    br: Extract<ReadJsonBodyResult<unknown>, { ok: false }>,
    init?: { headers?: HeadersInit }
) {
    return jsonInvalidPayload(invalidPayloadDetailsFromBodyRead(br), init);
}
