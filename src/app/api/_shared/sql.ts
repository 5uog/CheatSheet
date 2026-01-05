// FILE: src/app/api/_shared/sql.ts
export function safeJsonArrayExpr(colSql: string): string {
    // Ensures the expression is always a valid JSON array
    return `CASE WHEN json_valid(${colSql}) THEN ${colSql} ELSE '[]' END`;
}

export function safeJsonObjectExpr(colSql: string): string {
    // Ensures the expression is always a valid JSON object
    return `CASE WHEN json_valid(${colSql}) THEN ${colSql} ELSE '{}' END`;
}

export function safeJsonEach(colSql: string): string {
    // Safe table-valued function source
    return `json_each(${safeJsonArrayExpr(colSql)})`;
}

export function safeJsonExtract(colSql: string, path: string): string {
    // Safe JSON extraction
    return `json_extract(${safeJsonObjectExpr(colSql)}, '${path.replace(/'/g, "''")}')`;
}
