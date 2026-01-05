// FILE: src/app/api/questions/_query.ts
import type { Kind } from "./_schemas";
import { safeJsonEach, safeJsonExtract } from "@/app/api/_shared/sql";

export type SortKey = "id_desc" | "id_asc" | "created_desc" | "created_asc" | "updated_desc" | "updated_asc";
export const SortKeys: readonly SortKey[] = [
    "id_desc",
    "id_asc",
    "created_desc",
    "created_asc",
    "updated_desc",
    "updated_asc",
] as const;

export function orderByFor(sort: SortKey) {
    switch (sort) {
        case "id_asc":
            return "q.id ASC";
        case "created_asc":
            return "q.created_at ASC, q.id ASC";
        case "created_desc":
            return "q.created_at DESC, q.id DESC";
        case "updated_asc":
            return "q.updated_at ASC, q.id ASC";
        case "updated_desc":
            return "q.updated_at DESC, q.id DESC";
        case "id_desc":
        default:
            return "q.id DESC";
    }
}

export function isKind(x: string): x is Kind {
    return x === "boolean" || x === "choice" || x === "text" || x === "blank";
}

export function parsePaging(sp: URLSearchParams) {
    const pageSizeRaw = Number(sp.get("pageSize") ?? sp.get("limit") ?? "30");
    const pageRaw = Number(sp.get("page") ?? "1");
    const offsetRaw = Number(sp.get("offset") ?? "0");

    const pageSize = Math.max(1, Math.min(pageSizeRaw || 30, 500));
    const pageFromOffset = Number.isFinite(offsetRaw) ? Math.floor(Math.max(0, offsetRaw) / pageSize) + 1 : 1;
    const page = Math.max(1, Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : pageFromOffset);
    const offset = (page - 1) * pageSize;

    return { pageSize, page, offset };
}

export function parseSort(sp: URLSearchParams) {
    const sortRaw = (sp.get("sort") ?? "id_desc") as SortKey;
    const sort: SortKey = SortKeys.includes(sortRaw) ? sortRaw : "id_desc";
    const orderBy = orderByFor(sort);
    return { sort, orderBy };
}

export function buildFilters(params: { tag?: string; kind?: Kind | null; boolOnly?: "true" | "false" | null }) {
    const where: string[] = [];
    const args: unknown[] = [];

    if (params.tag && params.tag.trim()) {
        // IMPORTANT: json_each(<invalid json>) may throw even with WHERE json_valid(...).
        // Use safeJsonEach wrapper to always provide a valid array.
        where.push(`
            EXISTS (
                SELECT 1
                FROM ${safeJsonEach("q.tags_json")} je
                WHERE je.value = ?
            )
        `);
        args.push(params.tag.trim());
    }

    if (params.kind) {
        where.push(`${safeJsonExtract("q.answer_json", "$.type")} = ?`);
        args.push(params.kind);
    }

    if (params.boolOnly === "true") {
        where.push(
            `${safeJsonExtract("q.answer_json", "$.type")} = 'boolean' AND ${safeJsonExtract("q.answer_json", "$.value")} = 1`
        );
    } else if (params.boolOnly === "false") {
        where.push(
            `${safeJsonExtract("q.answer_json", "$.type")} = 'boolean' AND ${safeJsonExtract("q.answer_json", "$.value")} = 0`
        );
    }

    return { where, args };
}
