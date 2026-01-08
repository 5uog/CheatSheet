/**
 * FILE: src/app/lib/db/fts.ts
 *
 * This module owns the FTS5 object lifecycle for the questions search subsystem. It detects an
 * available tokenizer at runtime, creates or rebuilds the virtual table and triggers in an
 * idempotent way, and persists the selected tokenizer in the metadata table. It also exposes a
 * corruption classifier and a guarded repair entrypoint suitable for higher-layer retry logic.
 */

import { db } from "@/app/lib/db/handle";
import { getMeta, setMeta, initBaseSchema } from "@/app/lib/db/schema";

function detectTokenizer(): "trigram" | "unicode61" {
    try {
        db.exec(`
            DROP TABLE IF EXISTS __tok_test;
            CREATE VIRTUAL TABLE __tok_test USING fts5(x, tokenize='trigram');
            DROP TABLE __tok_test;
        `);
        return "trigram";
    } catch {
        try {
            db.exec(`
                DROP TABLE IF EXISTS __tok_test;
                CREATE VIRTUAL TABLE __tok_test USING fts5(x, tokenize='unicode61');
                DROP TABLE __tok_test;
            `);
            return "unicode61";
        } catch {
            return "unicode61";
        }
    }
}

function ftsExistsNow(): boolean {
    return (
        (db
            .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='questions_fts' LIMIT 1`)
            .get() as { 1: number } | undefined) != null
    );
}

function dropFtsObjects(): void {
    db.exec(`
        DROP TRIGGER IF EXISTS questions_ai;
        DROP TRIGGER IF EXISTS questions_ad;
        DROP TRIGGER IF EXISTS questions_au;
        DROP TABLE IF EXISTS questions_fts;
    `);
}

function createFtsObjects(tok: "trigram" | "unicode61"): void {
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts
        USING fts5(
            body,
            content='questions',
            content_rowid='id',
            tokenize='${tok}'
        );

        DROP TRIGGER IF EXISTS questions_ai;
        DROP TRIGGER IF EXISTS questions_ad;
        DROP TRIGGER IF EXISTS questions_au;

        CREATE TRIGGER questions_ai AFTER INSERT ON questions BEGIN
            INSERT INTO questions_fts(rowid, body) VALUES (new.id, new.body);
        END;

        CREATE TRIGGER questions_ad AFTER DELETE ON questions BEGIN
            INSERT INTO questions_fts(questions_fts, rowid, body) VALUES('delete', old.id, old.body);
        END;

        CREATE TRIGGER questions_au AFTER UPDATE OF body ON questions BEGIN
            INSERT INTO questions_fts(questions_fts, rowid, body) VALUES('delete', old.id, old.body);
            INSERT INTO questions_fts(rowid, body) VALUES (new.id, new.body);
        END;
    `);
}

function rebuildFts(tok: "trigram" | "unicode61"): void {
    dropFtsObjects();
    createFtsObjects(tok);
    db.exec(`INSERT INTO questions_fts(questions_fts) VALUES('rebuild');`);
    setMeta("fts_tokenizer", tok);
}

export function isSqliteCorruptionError(e: unknown): boolean {
    const err = e as { code?: unknown; message?: unknown } | null;
    const code = String(err?.code ?? "");
    const msg = String(err?.message ?? "");

    if (code.includes("SQLITE_CORRUPT")) return true;
    if (msg.toLowerCase().includes("database disk image is malformed")) return true;
    if (msg.toLowerCase().includes("is malformed")) return true;
    if (msg.toLowerCase().includes("corrupt")) return true;
    return false;
}

let repairing = false;

export function repairQuestionsFts(): void {
    if (repairing) return;
    repairing = true;
    try {
        rebuildFts(ftsTokenizer);
    } finally {
        repairing = false;
    }
}

export const ftsTokenizer = detectTokenizer();

export function initFtsSubsystem(): void {
    initBaseSchema();

    const prevTok = getMeta("fts_tokenizer");
    const needRecreateFts = prevTok !== ftsTokenizer;

    const ftsExists = ftsExistsNow();

    if (needRecreateFts && ftsExists) {
        dropFtsObjects();
    }

    if (!ftsExists || needRecreateFts) {
        createFtsObjects(ftsTokenizer);
        db.exec(`INSERT INTO questions_fts(questions_fts) VALUES('rebuild');`);
        setMeta("fts_tokenizer", ftsTokenizer);
    } else {
        createFtsObjects(ftsTokenizer);
        setMeta("fts_tokenizer", ftsTokenizer);
    }
}
