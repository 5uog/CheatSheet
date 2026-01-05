// FILE: src/app/api/_shared/http.ts
import { NextResponse } from "next/server";

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
    // Always apply our defaults first
    for (const [k, v] of Object.entries(NO_STORE_HEADERS)) h.set(k, v);
    // Then let caller override / add
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
