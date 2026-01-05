// FILE: src/lib/db.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.db");
const uploadsDir = path.join(dataDir, "uploads");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("recursive_triggers = OFF");

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

const tokenizer = detectTokenizer();

db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body TEXT NOT NULL,
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

function hasColumn(table: string, col: string): boolean {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === col);
}

function ensureColumn(table: string, col: string, ddl: string) {
    if (!hasColumn(table, col)) db.exec(ddl);
}

ensureColumn(
    "questions",
    "answer_json",
    `ALTER TABLE questions ADD COLUMN answer_json TEXT NOT NULL DEFAULT ('{"type":"boolean","value":1}');`
);
ensureColumn("questions", "tags_json", `ALTER TABLE questions ADD COLUMN tags_json TEXT NOT NULL DEFAULT ('[]');`);
ensureColumn("questions", "thumbs_json", `ALTER TABLE questions ADD COLUMN thumbs_json TEXT NOT NULL DEFAULT ('[]');`);

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

function getMeta(key: string): string | null {
    const row = db.prepare(`SELECT value FROM __meta WHERE key = ?`).get(key) as { value: string } | undefined;
    return row?.value ?? null;
}

function setMeta(key: string, value: string) {
    db.prepare(`INSERT INTO __meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(
        key,
        value
    );
}

function ftsExistsNow(): boolean {
    return (
        (db
            .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='questions_fts' LIMIT 1`)
            .get() as { 1: number } | undefined) != null
    );
}

function dropFtsObjects() {
    db.exec(`
        DROP TRIGGER IF EXISTS questions_ai;
        DROP TRIGGER IF EXISTS questions_ad;
        DROP TRIGGER IF EXISTS questions_au;
        DROP TABLE IF EXISTS questions_fts;
    `);
}

function createFtsObjects(tok: "trigram" | "unicode61") {
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

function rebuildFts(tok: "trigram" | "unicode61") {
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
        rebuildFts(tokenizer);
    } finally {
        repairing = false;
    }
}

const prevTok = getMeta("fts_tokenizer");
const needRecreateFts = prevTok !== tokenizer;

const ftsExists = ftsExistsNow();

if (needRecreateFts && ftsExists) {
    dropFtsObjects();
}

if (!ftsExists || needRecreateFts) {
    createFtsObjects(tokenizer);
    db.exec(`INSERT INTO questions_fts(questions_fts) VALUES('rebuild');`);
    setMeta("fts_tokenizer", tokenizer);
} else {
    createFtsObjects(tokenizer);
    setMeta("fts_tokenizer", tokenizer);
}

export const ftsTokenizer = tokenizer;
export const uploadsPath = uploadsDir;
