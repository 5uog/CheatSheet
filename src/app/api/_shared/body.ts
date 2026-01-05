// FILE: src/app/api/_shared/body.ts
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
    // If the client told us the size and it exceeds our cap, fail fast.
    const cl = getContentLength(req);
    if (cl != null && cl > maxBytes) return "too_large";

    // Prefer streaming to enforce cap before buffering everything
    const body = req.body;
    if (!body) return null;

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = value ?? new Uint8Array();
            total += chunk.byteLength;

            if (total > maxBytes) {
                // Stop early to avoid reading the rest into memory
                try {
                    await reader.cancel();
                } catch {
                    // ignore
                } finally {
                    try {
                        reader.releaseLock();
                    } catch {
                        // ignore
                    }
                }
                return "too_large";
            }

            chunks.push(chunk);
        }
    } catch {
        try {
            await reader.cancel();
        } catch {
            // ignore
        } finally {
            try {
                reader.releaseLock();
            } catch {
                // ignore
            }
        }
        return null;
    }

    try {
        reader.releaseLock();
    } catch {
        // ignore
    }

    if (total === 0) return null;

    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
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
        // Note: We intentionally do not trust declared charset for safety/simplicity.
        // JSON should be UTF-8 in practice; invalid sequences are replaced.
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
        if (!text.trim()) return { ok: false, error: "empty" };
        const json = JSON.parse(text) as T;
        return { ok: true, data: json };
    } catch {
        return { ok: false, error: "invalid_json" };
    }
}
