// FILE: src/app/features/lib/editor-utils.ts
import type { AnswerJson } from "@/app/features/lib/question-types";

export type NormalizedImportItem = {
    body: string;
    answer: AnswerJson;
    explanation?: string;
    tags?: string[];
    thumbnails?: string[];
};

export function safeParseJson(text: string): { ok: true; data: unknown } | { ok: false; error: string } {
    try {
        const v = JSON.parse(text) as unknown;
        return { ok: true, data: v };
    } catch {
        return { ok: false, error: "Invalid JSON." };
    }
}

export function buildExportJson(
    items: Array<{ body: string; answer: AnswerJson; explanation?: string; tags?: string[]; thumbnails?: string[] }>
) {
    return JSON.stringify({ items }, null, 2);
}

export function normalizeImportPayload(
    parsed: unknown,
    normalizeAnswer: (a: unknown) => AnswerJson | null
): { items: NormalizedImportItem[] } {
    const root = parsed as { items?: unknown };
    const arr = Array.isArray(root?.items) ? (root.items as unknown[]) : [];

    const out: NormalizedImportItem[] = [];

    for (const it of arr) {
        const o = it as { body?: unknown; answer?: unknown; explanation?: unknown; tags?: unknown; thumbnails?: unknown };

        const body = typeof o.body === "string" ? o.body.trim() : "";
        const answer = normalizeAnswer(o.answer);
        if (!body || !answer) continue;

        const explanation = typeof o.explanation === "string" ? o.explanation.trim().slice(0, 20000) : undefined;

        const tags =
            Array.isArray(o.tags)
                ? o.tags
                    .filter((x) => typeof x === "string")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 200)
                : undefined;

        const thumbnails =
            Array.isArray(o.thumbnails)
                ? o.thumbnails
                    .filter((x) => typeof x === "string")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 200)
                : undefined;

        out.push({ body, answer, explanation, tags, thumbnails });
    }

    return { items: out };
}

export function computeSignature(body: string, answer: AnswerJson) {
    const b = (body ?? "").trim();
    const a = stableStringify(answer);
    return hashString(`${b}\n---\n${a}`);
}

function stableStringify(v: unknown) {
    return JSON.stringify(v, Object.keys(v as object).sort());
}

function hashString(s: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return `fnv1a32:${(h >>> 0).toString(16).padStart(8, "0")}`;
}
