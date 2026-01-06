// FILE: src/app/features/lib/answer-utils.ts
"use client";

import type { AnswerJson } from "@/app/features/lib/question-types";

export function answerTypeLabel(t: AnswerJson["type"]) {
    switch (t) {
        case "boolean":
            return "Boolean";
        case "choice":
            return "Choice";
        case "text":
            return "Text";
        case "blank":
            return "Blank";
    }
}

export function safeInt(s: string) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

export function normalizeAnswer(a: unknown): AnswerJson | null {
    if (!a || typeof a !== "object") return null;
    const t = (a as { type?: unknown }).type;

    if (t === "boolean") {
        const v = (a as { value?: unknown }).value;
        return v === 0 || v === 1 ? { type: "boolean", value: v } : null;
    }
    if (t === "choice") {
        const options = (a as { options?: unknown }).options;
        const correct = (a as { correct?: unknown }).correct;
        if (!Array.isArray(options) || !Array.isArray(correct)) return null;

        const opts = options
            .filter((x) => typeof x === "string")
            .map((x) => x.trim())
            .filter(Boolean);

        const corr = Array.from(
            new Set(
                correct
                    .map((x) => Number(x))
                    .filter((n) => Number.isFinite(n))
                    .map((n) => Math.trunc(n))
            )
        ).filter((n) => n >= 0 && n < opts.length);

        if (opts.length === 0 || corr.length === 0) return null;
        return { type: "choice", options: opts, correct: corr };
    }
    if (t === "text") {
        const v = (a as { value?: unknown }).value;
        return typeof v === "string" ? { type: "text", value: v } : null;
    }
    if (t === "blank") {
        const v = (a as { value?: unknown }).value;
        return typeof v === "string" ? { type: "blank", value: v } : null;
    }
    return null;
}
