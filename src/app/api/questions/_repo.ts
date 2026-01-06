/**
 * FILE: src/app/api/questions/_repo.ts
 *
 * This module implements the repository boundary for the questions domain on top of a local
 * SQLite database connection. It exposes narrowly scoped read and write operations that execute
 * parameterized SQL against the base table and returns either raw rows or a mapped transport-ready
 * shape. Row mapping is deliberately defensive for JSON-backed columns: answer, tags, and thumbnail
 * fields are parsed through schema-aware safe parsers so that malformed persisted JSON degrades to
 * stable defaults instead of propagating exceptions into route handlers. The module also contains
 * legacy-schema compatibility for an older `answer` column by detecting its presence at runtime and
 * maintaining its invariant during inserts and updates, allowing the application to operate across
 * mixed on-disk schemas without duplicating compatibility logic in higher layers.
 */

import { db } from "@/app/lib/db";
import { safeParseAnswerJson, safeParseJsonArray } from "@/app/api/questions/_schemas";

export type ItemRow = {
    id: number;
    body: string;
    explanation: string;
    answer_json: string;
    tags_json: string;
    thumbs_json: string;
    created_at: string;
    updated_at: string;
};

export type QuestionItem = {
    id: number;
    body: string;
    explanation: string;
    answer: ReturnType<typeof safeParseAnswerJson>;
    tags: string[];
    thumbnails: string[];
    created_at: string;
    updated_at: string;
};

export function mapRow(r: ItemRow): QuestionItem {
    return {
        id: r.id,
        body: r.body,
        explanation: typeof r.explanation === "string" ? r.explanation : "",
        answer: safeParseAnswerJson(r.answer_json),
        tags: safeParseJsonArray(r.tags_json),
        thumbnails: safeParseJsonArray(r.thumbs_json),
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}

function hasColumn(table: string, col: string): boolean {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === col);
}

// Legacy column compatibility (old schema had NOT NULL `answer`)
const HAS_LEGACY_ANSWER_COL = hasColumn("questions", "answer");

function legacyAnswerValueFromAnswerJson(answerJson: string): 0 | 1 {
    const a = safeParseAnswerJson(answerJson);
    if (a.type === "boolean") return a.value;
    return 1;
}

export function getById(id: number): ItemRow | undefined {
    return db
        .prepare(`
            SELECT id, body, explanation, answer_json, tags_json, thumbs_json, created_at, updated_at
            FROM questions
            WHERE id = ?
        `)
        .get(id) as ItemRow | undefined;
}

export function deleteById(id: number) {
    db.prepare(`DELETE FROM questions WHERE id = ?`).run(id);
}

function updateQuestionsBaseTable(args: {
    id: number;
    nextBody: string;
    nextExplanation: string;
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    if (HAS_LEGACY_ANSWER_COL) {
        const legacy = legacyAnswerValueFromAnswerJson(args.nextAnswer);
        db.prepare(`
            UPDATE questions
            SET body = ?, explanation = ?, answer_json = ?, tags_json = ?, thumbs_json = ?, answer = ?, updated_at = datetime('now')
            WHERE id = ?
        `)
        .run(args.nextBody, args.nextExplanation, args.nextAnswer, args.nextTags, args.nextThumbs, legacy, args.id);
        return;
    }

    db.prepare(`
        UPDATE questions
        SET body = ?, explanation = ?, answer_json = ?, tags_json = ?, thumbs_json = ?, updated_at = datetime('now')
        WHERE id = ?
    `)
    .run(args.nextBody, args.nextExplanation, args.nextAnswer, args.nextTags, args.nextThumbs, args.id);
}

export function updateById(args: {
    id: number;
    nextBody: string;
    nextExplanation: string;
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    updateQuestionsBaseTable(args);
}

/**
 * Last-resort base-table mutation (bypasses FTS plumbing / triggers concerns).
 * Still preserves legacy schema invariants when the old `answer` column exists.
 */
export function updateBaseTableById(args: {
    id: number;
    nextBody: string;
    nextExplanation: string;
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    updateQuestionsBaseTable(args);
}

export function insertOne(args: {
    body: string;
    explanation: string;
    answerJson: string;
    tagsJson: string;
    thumbsJson: string;
}) {
    if (HAS_LEGACY_ANSWER_COL) {
        const legacy = legacyAnswerValueFromAnswerJson(args.answerJson);
        db.prepare(`
            INSERT INTO questions(body, explanation, answer_json, tags_json, thumbs_json, answer) VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(args.body, args.explanation, args.answerJson, args.tagsJson, args.thumbsJson, legacy);
    } else {
        db.prepare(`
            INSERT INTO questions(body, explanation, answer_json, tags_json, thumbs_json) VALUES (?, ?, ?, ?, ?)
        `)
        .run(args.body, args.explanation, args.answerJson, args.tagsJson, args.thumbsJson);
    }

    return db
        .prepare(`
            SELECT id, body, explanation, answer_json, tags_json, thumbs_json, created_at, updated_at
            FROM questions
            WHERE id = last_insert_rowid()
        `)
        .get() as ItemRow | undefined;
}
