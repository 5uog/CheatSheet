/**
 * FILE: src/app/api/_shared/body.ts
 *
 * This module implements a bounded JSON body reader for Next.js route handlers that consume the 
 * standard Web Request interface. It enforces a strict byte cap while reading from the request 
 * stream so oversized payloads can be rejected without unbounded buffering, then materializes the 
 * accepted bytes into a single Uint8Array for UTF-8 decoding and JSON parsing. The exported API 
 * returns a discriminated result that separates a successful parse from three stable failure 
 * classes—oversized payloads, syntactically invalid JSON, and semantically empty bodies—so callers 
 * can map input defects to deterministic HTTP responses without using exceptions as control flow.
 */

export type ReadJsonBodyResult<T> = 
    | { ok: true; data: T }
    | { ok: false; error: "too_large" | "invalid_json" | "empty" };

function getContentLength(req: Request): number | null {
    const v = req.headers.get("content-length");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

async function readBodyUpTo(req: Request, maxBytes: number): Promise<Uint8Array | null | "too_large"> {
    const cl = getContentLength(req);
    if (cl != null && cl > maxBytes) return "too_large";

    const body = req.body;
    if (!body) return null;

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    const safeCancel = async () => {
        try {
            await reader.cancel();
        } catch {
            // ignore
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = value ?? new Uint8Array();
            total += chunk.byteLength;

            if (total > maxBytes) {
                await safeCancel();
                return "too_large";
            }

            chunks.push(chunk);
        }
    } catch {
        await safeCancel();
        return null;
    } finally {
        try {
            reader.releaseLock();
        } catch {
            // ignore
        }
    }

    if (total === 0) return null;

    const out = new Uint8Array(total);
    for (let off = 0, i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        out.set(c, off);
        off += c.byteLength;
    }
    return out;
}

export async function readJsonBodySafe<T = unknown>(req: Request, maxBytes = 1_000_000): Promise<ReadJsonBodyResult<T>> {
    const buf = await readBodyUpTo(req, maxBytes);
    if (buf === "too_large") return { ok: false, error: "too_large" };
    if (buf == null) return { ok: false, error: "empty" };

    try {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
        if (!text.trim()) return { ok: false, error: "empty" };
        return { ok: true, data: JSON.parse(text) as T };
    } catch {
        return { ok: false, error: "invalid_json" };
    }
}
