/**
 * FILE: src/app/lib/db/handle.ts
 *
 * This module owns the process-local SQLite handle and the on-disk layout primitives used by the
 * rest of the database subsystem. It provisions the application data directory, ensures the uploads
 * directory exists, and configures a small set of SQLite pragmas that materially affect durability
 * and constraint behavior. The exported surface is intentionally narrow so higher layers do not
 * depend on schema or FTS lifecycle details.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const dataDir = path.join(process.cwd(), "data");
export const dbPath = path.join(dataDir, "app.db");
export const uploadsPath = path.join(dataDir, "uploads");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("recursive_triggers = OFF");
