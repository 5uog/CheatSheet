/**
 * FILE: src/app/api/_shared/sql.ts
 *
 * This module centralizes small SQLite SQL expression builders used to safely consume JSON stored
 * in text columns. SQLite JSON1 functions may raise errors when invoked on invalid JSON, and some
 * table-valued functions can fail even if guarded by a WHERE json_valid(...) predicate due to query
 * planner behavior. The helpers here wrap column expressions so the resulting SQL is total with
 * respect to malformed JSON, producing a valid empty array or object fallback and allowing callers
 * to use json_each/json_extract without relying on runtime exceptions.
 *
 * For JSON path arguments, this module exposes an expression builder that returns `{ sql, args }`
 * so callers can bind the path as a parameter instead of interpolating it into SQL text.
 */

export type SqlExpr = { sql: string; args: unknown[] };

export function safeJsonArrayExpr(colSql: string): string {
    return `CASE WHEN json_valid(${colSql}) THEN ${colSql} ELSE '[]' END`;
}

export function safeJsonObjectExpr(colSql: string): string {
    return `CASE WHEN json_valid(${colSql}) THEN ${colSql} ELSE '{}' END`;
}

export function safeJsonEach(colSql: string): string {
    return `json_each(${safeJsonArrayExpr(colSql)})`;
}

/**
 * Builds a json_extract expression with a bound JSON path parameter.
 *
 * Example:
 *   const ex = safeJsonExtractExpr("q.answer_json", "$.type");
 *   where.push(`${ex.sql} = ?`);
 *   args.push(...ex.args, kind);
 */
export function safeJsonExtractExpr(colSql: string, path: string): SqlExpr {
    return {
        sql: `json_extract(${safeJsonObjectExpr(colSql)}, ?)`,
        args: [String(path ?? "")],
    };
}
