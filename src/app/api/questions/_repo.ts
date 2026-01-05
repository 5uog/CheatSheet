// FILE: src/app/api/questions/_repo.ts
import { db } from "@/app/lib/db";
import { safeParseAnswerJson, safeParseJsonArray } from "./_schemas";

export type ItemRow = {
    id: number;
    body: string;
    answer_json: string;
    tags_json: string;
    thumbs_json: string;
    created_at: string;
    updated_at: string;
};

export type QuestionItem = {
    id: number;
    body: string;
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
        .prepare(
            `
            SELECT id, body, answer_json, tags_json, thumbs_json, created_at, updated_at
            FROM questions
            WHERE id = ?
        `
        )
        .get(id) as ItemRow | undefined;
}

export function deleteById(id: number) {
    db.prepare(`DELETE FROM questions WHERE id = ?`).run(id);
}

function updateQuestionsBaseTable(args: {
    id: number;
    nextBody: string;
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    if (HAS_LEGACY_ANSWER_COL) {
        const legacy = legacyAnswerValueFromAnswerJson(args.nextAnswer);
        db.prepare(
            `
            UPDATE questions
            SET body = ?, answer_json = ?, tags_json = ?, thumbs_json = ?, answer = ?, updated_at = datetime('now')
            WHERE id = ?
        `
        ).run(args.nextBody, args.nextAnswer, args.nextTags, args.nextThumbs, legacy, args.id);
        return;
    }

    db.prepare(
        `
        UPDATE questions
        SET body = ?, answer_json = ?, tags_json = ?, thumbs_json = ?, updated_at = datetime('now')
        WHERE id = ?
    `
    ).run(args.nextBody, args.nextAnswer, args.nextTags, args.nextThumbs, args.id);
}

export function updateById(args: {
    id: number;
    nextBody: string;
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
    nextAnswer: string;
    nextTags: string;
    nextThumbs: string;
}) {
    updateQuestionsBaseTable(args);
}

export function insertOne(args: { body: string; answerJson: string; tagsJson: string; thumbsJson: string }) {
    if (HAS_LEGACY_ANSWER_COL) {
        const legacy = legacyAnswerValueFromAnswerJson(args.answerJson);
        db.prepare(
            `
            INSERT INTO questions(body, answer_json, tags_json, thumbs_json, answer) VALUES (?, ?, ?, ?, ?)
        `
        ).run(args.body, args.answerJson, args.tagsJson, args.thumbsJson, legacy);
    } else {
        db.prepare(
            `
            INSERT INTO questions(body, answer_json, tags_json, thumbs_json) VALUES (?, ?, ?, ?)
        `
        ).run(args.body, args.answerJson, args.tagsJson, args.thumbsJson);
    }

    return db
        .prepare(
            `
            SELECT id, body, answer_json, tags_json, thumbs_json, created_at, updated_at
            FROM questions
            WHERE id = last_insert_rowid()
        `
        )
        .get() as ItemRow | undefined;
}
