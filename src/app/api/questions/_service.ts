/**
 * FILE: src/app/api/questions/_service.ts
 *
 * This module implements application-level procedures for the questions domain, including input
 * normalization across schema versions and corruption-aware mutation workflows. It consolidates
 * SQLite corruption recovery by attempting a repository mutation, repairing the questions FTS
 * objects on corruption-class failures, and retrying before falling back to a last-resort
 * base-table mutation that bypasses FTS plumbing. It also defines deterministic transformations
 * that convert validated request payloads into the exact persistent shapes used by the repository,
 * so route handlers can remain transport-focused while normalization and cross-version
 * interpretation stay centralized.
 */

import { db, ftsTokenizer, isSqliteCorruptionError, repairQuestionsFts } from "@/app/lib/db";
import { parseSearch as parseSearchCore } from "@/app/lib/search";
import type { AnswerJson, Kind } from "@/app/api/questions/_schemas";
import { normalizeChoiceAnswer, normalizeStringArray, serializeAnswer } from "@/app/api/questions/_schemas";
import * as repo from "@/app/api/questions/_repo";

export function parseSearch(q: string) {
    return parseSearchCore(q, { tokenizer: ftsTokenizer });
}

export function updateQuestionRobust(args: {
    id: number;
    nextBody: string;
    nextExplanation: string;
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

    try {
        repo.updateById(args);
        return;
    } catch (e2) {
        if (!isSqliteCorruptionError(e2)) throw e2;
    }

    repo.updateBaseTableById(args);
}

export function deleteQuestionRobust(id: number) {
    try {
        repo.deleteById(id);
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

export function buildCreatePayload(data: unknown):
    | { ok: true; body: string; explanation: string; answerJson: string; tagsJson: string; thumbsJson: string }
    | { ok: false; error: "empty_body" } {
    const d = data as { body?: unknown; explanation?: unknown; tags?: unknown; thumbnails?: unknown };

    const body = String(d.body ?? "").trim();
    if (!body) return { ok: false, error: "empty_body" };

    const explanation = typeof d.explanation === "string" ? d.explanation : "";
    const explanationTrimmed = explanation.trim();

    const { answerJson } = buildCreateAnswer(data);

    const tags = normalizeStringArray(Array.isArray(d.tags) ? (d.tags as string[]) : [], 200);
    const thumbs = normalizeStringArray(Array.isArray(d.thumbnails) ? (d.thumbnails as string[]) : [], 200);

    return {
        ok: true,
        body,
        explanation: explanationTrimmed,
        answerJson,
        tagsJson: JSON.stringify(tags),
        thumbsJson: JSON.stringify(thumbs),
    };
}

export function buildUpdatePayload(args: {
    existing: repo.ItemRow;
    patch: { body?: string; explanation?: string; answer?: AnswerJson; tags?: string[]; thumbnails?: string[] };
}):
    | { ok: true; nextBody: string; nextExplanation: string; nextAnswer: string; nextTags: string; nextThumbs: string }
    | { ok: false; error: "empty_body" } {
    const { existing, patch } = args;

    const nextBody = (patch.body ?? existing.body).trim();
    if (!nextBody) return { ok: false, error: "empty_body" };

    const nextExplanation = (patch.explanation ?? existing.explanation ?? "").trim();

    const nextAnswer = patch.answer ? serializeAnswer(patch.answer) : existing.answer_json;

    const nextTags = patch.tags != null ? JSON.stringify(normalizeStringArray(patch.tags, 200)) : existing.tags_json;

    const nextThumbs =
        patch.thumbnails != null ? JSON.stringify(normalizeStringArray(patch.thumbnails, 200)) : existing.thumbs_json;

    return { ok: true, nextBody, nextExplanation, nextAnswer, nextTags, nextThumbs };
}
