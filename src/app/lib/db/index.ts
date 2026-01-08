/**
 * FILE: src/app/lib/db/index.ts
 *
 * This module is the stable public entrypoint for the local database subsystem. It re-exports the
 * process-local SQLite handle, uploads path, tokenizer selection, and repair utilities, while
 * ensuring schema and FTS initialization is performed exactly once at module load.
 */

export { db, uploadsPath, dataDir, dbPath } from "@/app/lib/db/handle";
export { hasColumn, getMeta, setMeta, initBaseSchema } from "@/app/lib/db/schema";
export { ftsTokenizer, isSqliteCorruptionError, repairQuestionsFts, initFtsSubsystem } from "@/app/lib/db/fts";

import { initFtsSubsystem } from "@/app/lib/db/fts";
initFtsSubsystem();
