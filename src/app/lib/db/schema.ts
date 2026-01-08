/**
 * FILE: src/app/lib/db/schema.ts
 *
 * This module performs idempotent schema initialization and legacy-column migration for the base
 * tables used by the application. It also manages a small metadata table that persists subsystem
 * decisions (such as the chosen FTS tokenizer) across process restarts. The helpers here are pure
 * schema/DDL concerns and intentionally do not handle FTS object lifecycle.
 */

import { db } from "@/app/lib/db/handle";

export function initBaseSchema(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            body TEXT NOT NULL,
            explanation TEXT NOT NULL DEFAULT (''),
            answer_json TEXT NOT NULL DEFAULT ('{"type":"boolean","value":1}'),
            tags_json TEXT NOT NULL DEFAULT ('[]'),
            thumbs_json TEXT NOT NULL DEFAULT ('[]'),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS __meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    ensureColumn(
        "questions",
        "answer_json",
        `ALTER TABLE questions ADD COLUMN answer_json TEXT NOT NULL DEFAULT ('{"type":"boolean","value":1}');`
    );
    ensureColumn("questions", "tags_json", `ALTER TABLE questions ADD COLUMN tags_json TEXT NOT NULL DEFAULT ('[]');`);
    ensureColumn(
        "questions",
        "thumbs_json",
        `ALTER TABLE questions ADD COLUMN thumbs_json TEXT NOT NULL DEFAULT ('[]');`
    );
    ensureColumn("questions", "explanation", `ALTER TABLE questions ADD COLUMN explanation TEXT NOT NULL DEFAULT ('');`);

    migrateLegacyColumns();
}

export function hasColumn(table: string, col: string): boolean {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === col);
}

function ensureColumn(table: string, col: string, ddl: string): void {
    if (!hasColumn(table, col)) db.exec(ddl);
}

function migrateLegacyColumns(): void {
    if (hasColumn("questions", "answer") && hasColumn("questions", "answer_json")) {
        db.exec(`
            UPDATE questions
            SET answer_json = json_object('type','boolean','value', answer)
            WHERE answer_json IS NULL OR answer_json = '' OR answer_json = '{"type":"boolean","value":1}';
        `);
    }

    if (hasColumn("questions", "thumbnails") && hasColumn("questions", "thumbs_json")) {
        db.exec(`
            UPDATE questions
            SET thumbs_json = COALESCE(thumbnails, '[]')
            WHERE (thumbs_json IS NULL OR thumbs_json = '' OR thumbs_json = '[]')
                AND thumbnails IS NOT NULL
                AND thumbnails != '';
        `);
    }

    if (hasColumn("questions", "tags") && hasColumn("questions", "tags_json")) {
        db.exec(`
            UPDATE questions
            SET tags_json = COALESCE(tags, '[]')
            WHERE (tags_json IS NULL OR tags_json = '' OR tags_json = '[]')
                AND tags IS NOT NULL
                AND tags != '';
        `);
    }
}

export function getMeta(key: string): string | null {
    const row = db.prepare(`SELECT value FROM __meta WHERE key = ?`).get(key) as { value: string } | undefined;
    return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
    db.prepare(`INSERT INTO __meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(
        key,
        value
    );
}
