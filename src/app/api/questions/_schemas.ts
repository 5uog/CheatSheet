// FILE: src/app/api/questions/_schemas.ts
import { z } from "zod";

export type AnswerJson =
    | { type: "boolean"; value: 0 | 1 }
    | { type: "choice"; options: string[]; correct: number[] }
    | { type: "text"; value: string }
    | { type: "blank"; value: string };

export type Kind = AnswerJson["type"];

export const AnswerSchema: z.ZodType<AnswerJson> = z.union([
    z.object({ type: z.literal("boolean"), value: z.union([z.literal(0), z.literal(1)]) }),
    z.object({
        type: z.literal("choice"),
        options: z.array(z.string().min(1).max(20000)).min(1).max(200),
        correct: z.array(z.number().int().min(0).max(10_000)).min(1).max(200),
    }),
    z.object({ type: z.literal("text"), value: z.string().max(20000) }),
    z.object({ type: z.literal("blank"), value: z.string().max(20000) }),
]);

export const UpdateSchema = z.object({
    body: z.string().min(1).max(20000).optional(),
    answer: AnswerSchema.optional(),
    tags: z.array(z.string().min(1).max(200)).max(200).optional(),
    thumbnails: z.array(z.string().min(1).max(2000)).max(200).optional(),
});

export const CreateSchema = z.object({
    body: z.string().min(1).max(20000),
    answer: AnswerSchema,
    tags: z.array(z.string().min(1).max(200)).max(200).optional(),
    thumbnails: z.array(z.string().min(1).max(2000)).max(200).optional(),
});

export const LegacyCreateSchema = z.object({
    body: z.string().min(1).max(20000),
    kind: z.union([z.literal("boolean"), z.literal("choice"), z.literal("text")]),
    tags: z.array(z.string().min(1).max(200)).max(200).optional(),
    thumbnails: z.array(z.string().min(1).max(2000)).max(200).optional(),
    options: z.array(z.string().min(1).max(20000)).max(200).optional(),
    correctIndices: z.array(z.number().int().min(0).max(10_000)).max(200).optional(),
    correctText: z.string().max(20000).nullable().optional(),
});

export const CreateAnySchema = z.union([CreateSchema, LegacyCreateSchema]);

export function safeParseJsonArray(s: string): string[] {
    try {
        const v: unknown = JSON.parse(s);
        if (!Array.isArray(v)) return [];
        return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
    } catch {
        return [];
    }
}

export function normalizeStringArray(xs: string[], max: number): string[] {
    return Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean))).slice(0, max);
}

export function normalizeChoiceAnswer(a: AnswerJson): AnswerJson {
    if (a.type !== "choice") return a;
    const opts = a.options.map((x) => x.trim()).filter((x) => x.length > 0);
    const maxIdx = opts.length - 1;

    const corr = Array.from(new Set(a.correct.map((n) => Number(n)).filter((n) => Number.isFinite(n))))
        .map((n) => Math.trunc(n))
        .filter((n) => n >= 0 && n <= maxIdx);

    if (opts.length === 0 || corr.length === 0) {
        return { type: "choice", options: opts.length ? opts : ["(option)"], correct: [0] };
    }
    return { type: "choice", options: opts, correct: corr };
}

export function serializeAnswer(a: AnswerJson): string {
    return JSON.stringify(normalizeChoiceAnswer(a));
}

export function safeParseAnswerJson(s: string): AnswerJson {
    try {
        const v: unknown = JSON.parse(s);
        const parsed = AnswerSchema.safeParse(v);
        if (parsed.success) return parsed.data;
    } catch {}
    return { type: "boolean", value: 1 };
}
