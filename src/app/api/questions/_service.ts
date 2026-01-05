// FILE: src/app/api/questions/_service.ts
import { db, ftsTokenizer, isSqliteCorruptionError, repairQuestionsFts } from "@/app/lib/db";
import { parseQuery } from "@/app/lib/search";
import type { AnswerJson, Kind } from "./_schemas";
import { normalizeChoiceAnswer, serializeAnswer } from "./_schemas";
import * as repo from "./_repo";

export function shouldAutoFallbackToLike(originalQ: string) {
    const q = (originalQ ?? "").trim();
    if (!q) return false;

    if (q.startsWith("=") || q.startsWith("~")) return false;
    if (ftsTokenizer !== "trigram") return false;

    const tokens: string[] = [];

    const phraseRe = /"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = phraseRe.exec(q)) !== null) {
        const inner = (m[1] ?? "").trim();
        if (inner) tokens.push(inner);
    }

    const qNoPhrases = q.replace(/"([^"]*)"/g, " ").trim();
    const rawParts = qNoPhrases.split(/\s+/).filter(Boolean);

    for (const part of rawParts) {
        if (part === "OR" || part === "|") continue;
        if (part === "(" || part === ")") continue;

        const t0 = part.startsWith("-") ? part.slice(1) : part;
        if (!t0) continue;

        const t1 = t0.replace(/^[()]+|[()]+$/g, "");
        if (!t1) continue;

        tokens.push(t1);
    }

    for (const tok of tokens) {
        const t = tok.endsWith("*") ? tok.slice(0, -1) : tok;
        const clean = t.trim();
        if (!clean) continue;
        if (clean.length < 3) return true;
    }

    return false;
}

export function updateQuestionWithRetry(args: {
    id: number;
    nextBody: string;
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    try {
        repo.updateById(args);
        return;
    } catch (e) {
        if (!isSqliteCorruptionError(e)) throw e;
    }

    repairQuestionsFts();
    repo.updateById(args);
}

export function deleteQuestionWithRetry(id: number) {
    try {
        repo.deleteById(id);
        return;
    } catch (e) {
        if (!isSqliteCorruptionError(e)) throw e;
    }

    repairQuestionsFts();
    repo.deleteById(id);
}

/**
 * Consolidates corruption recovery into the service layer.
 * Keeps route handlers I/O-bound and deterministic.
 * Uses a staged fallback: repo -> rebuild FTS -> retry -> direct base-table mutation.
 * Direct SQL is a last resort to preserve availability under persistent FTS faults.
 */
export function updateQuestionRobust(args: {
    id: number;
    nextBody: string;
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    try {
        updateQuestionWithRetry(args);
        return;
    } catch (e) {
        if (!isSqliteCorruptionError(e)) throw e;
    }

    repairQuestionsFts();
    try {
        repo.updateById(args);
        return;
    } catch (e2) {
        if (!isSqliteCorruptionError(e2)) throw e2;
    }

    // Final fallback: mutate base table while preserving legacy invariants
    repo.updateBaseTableById(args);
}

/**
 * Consolidates corruption recovery into the service layer.
 * Prefers repo invariants; escalates only on corruption-class failures.
 * Final fallback bypasses FTS plumbing and targets the base table directly.
 */
export function deleteQuestionRobust(id: number) {
    try {
        deleteQuestionWithRetry(id);
        return;
    } catch (e) {
        if (!isSqliteCorruptionError(e)) throw e;
    }

    repairQuestionsFts();
    try {
        repo.deleteById(id);
        return;
    } catch (e2) {
        if (!isSqliteCorruptionError(e2)) throw e2;
    }

    db.prepare(`DELETE FROM questions WHERE id = ?`).run(id);
}

export function buildCreateAnswer(data: unknown): { answer: AnswerJson; answerJson: string } {
    const d = data as Record<string, unknown>;

    let answer: AnswerJson;

    if ("answer" in d) {
        answer = d.answer as AnswerJson;
    } else {
        const k = d.kind as Kind;

        if (k === "boolean") {
            const idxs = Array.isArray(d.correctIndices) ? d.correctIndices : [];
            const first = idxs[0];
            const v = typeof first === "number" && first === 1 ? 0 : 1;
            answer = { type: "boolean", value: v as 0 | 1 };
        } else if (k === "choice") {
            const opts0 = Array.isArray(d.options) ? d.options : [];
            const options = opts0
                .map((x) => String(x).trim())
                .filter(Boolean)
                .slice(0, 200);

            const maxIdx = options.length - 1;
            const corr0 = Array.isArray(d.correctIndices) ? d.correctIndices : [];

            const correct = Array.from(
                new Set(
                    corr0
                        .map((x) => Number(x))
                        .filter((x) => Number.isFinite(x))
                        .map((x) => Math.trunc(x))
                )
            )
                .filter((n) => n >= 0 && n <= maxIdx)
                .slice(0, 200);

            answer = normalizeChoiceAnswer({
                type: "choice",
                options: options.length ? options : ["(option)"],
                correct: correct.length ? correct : [0],
            });
        } else {
            const v = d.correctText;
            answer = { type: "text", value: typeof v === "string" ? v : "" };
        }
    }

    const answerJson = serializeAnswer(answer);
    return { answer, answerJson };
}

export function parseSearch(q: string) {
    if (shouldAutoFallbackToLike(q)) {
        const likeParsed = parseQuery(`~${q}`);
        if (likeParsed.kind === "like") {
            return { ...likeParsed, autoFallback: true as const };
        }
    }
    const parsed = parseQuery(q);
    return { ...parsed, autoFallback: false as const };
}
