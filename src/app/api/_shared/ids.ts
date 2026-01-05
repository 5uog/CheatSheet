// FILE: src/app/api/_shared/ids.ts
import { readParams, type ParamsLike } from "./params";

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
