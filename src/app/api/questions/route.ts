/**
 * FILE: src/app/api/questions/route.ts
 *
 * This route module exposes collection-level query and creation endpoints for questions while
 * keeping the handler logic transport-oriented. On reads, it parses query-string parameters into
 * paging, sorting, and filter primitives, delegates query-language parsing to the domain service,
 * and executes parameterized SQL without embedding normalization policy into the route layer. On
 * creates, it uses the shared bounded JSON reader and Zod validation, then delegates canonical
 * payload construction to the service layer so that trimming, cross-version interpretation, and
 * JSON serialization are not duplicated across endpoints.
 */

import { db, ftsTokenizer } from "@/app/lib/db";
import { jsonError, jsonInvalidPayloadFromBodyRead, jsonOk } from "@/app/api/_shared/http";
import { readJsonBodySafe } from "@/app/api/_shared/body";
import { CreateAnySchema } from "@/app/api/questions/_schemas";
import { isKind, parsePaging, parseSort, buildFilters } from "@/app/api/questions/_query";
import * as service from "@/app/api/questions/_service";
import * as repo from "@/app/api/questions/_repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const { pageSize, page, offset } = parsePaging(searchParams);
    const { sort, orderBy } = parseSort(searchParams);

    const tag = searchParams.get("tag") ?? "";

    const kindRaw = (searchParams.get("kind") ?? "").trim();
    const kind = isKind(kindRaw) ? kindRaw : null;

    const boolRaw = (searchParams.get("boolOnly") ?? searchParams.get("bool") ?? "").trim();
    const boolOnly: "true" | "false" | null = boolRaw === "true" || boolRaw === "false" ? boolRaw : null;

    const filters = buildFilters({ tag, kind, boolOnly });
    const parsed = service.parseSearch(q);

    if (parsed.kind === "exact") {
        const whereParts: string[] = [`q.body = ?`, ...filters.where];
        const args: unknown[] = [parsed.body, ...filters.args];
        const whereSql = `WHERE ${whereParts.join(" AND ")}`;

        const totalRow = db
            .prepare(`SELECT COUNT(*) AS n FROM questions q ${whereSql}`)
            .get(...args) as { n: number } | undefined;

        const rows = db
            .prepare(`
                SELECT q.id, q.body, q.explanation, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
                FROM questions q
                ${whereSql}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `)
            .all(...args, pageSize, offset) as repo.ItemRow[];

        return jsonOk({
            items: rows.map(repo.mapRow),
            mode: "exact" as const,
            total: totalRow?.n ?? 0,
            page,
            pageSize,
            sort,
        });
    }

    if (parsed.kind === "like") {
        const whereParts: string[] = [`(${parsed.where})`, ...filters.where];
        const args: unknown[] = [...parsed.params, ...filters.args];
        const whereSql = `WHERE ${whereParts.join(" AND ")}`;

        const totalRow = db
            .prepare(`SELECT COUNT(*) AS n FROM questions q ${whereSql}`)
            .get(...args) as { n: number } | undefined;

        const rows = db
            .prepare(`
                SELECT q.id, q.body, q.explanation, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
                FROM questions q
                ${whereSql}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `)
            .all(...args, pageSize, offset) as repo.ItemRow[];

        return jsonOk({
            items: rows.map(repo.mapRow),
            mode: "like" as const,
            autoFallback: parsed.autoFallback,
            total: totalRow?.n ?? 0,
            page,
            pageSize,
            sort,
        });
    }

    if (parsed.kind === "fts") {
        const whereParts: string[] = [`questions_fts MATCH ?`, ...filters.where];
        const args: unknown[] = [parsed.match, ...filters.args];
        const whereSql = `WHERE ${whereParts.join(" AND ")}`;

        const totalRow = db
            .prepare(`
                SELECT COUNT(*) AS n
                FROM questions_fts f
                JOIN questions q ON q.id = f.rowid
                ${whereSql}
            `)
            .get(...args) as { n: number } | undefined;

        const rows = db
            .prepare(`
                SELECT q.id, q.body, q.explanation, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
                FROM questions_fts f
                JOIN questions q ON q.id = f.rowid
                ${whereSql}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `)
            .all(...args, pageSize, offset) as repo.ItemRow[];

        return jsonOk({
            items: rows.map(repo.mapRow),
            mode: "fts" as const,
            total: totalRow?.n ?? 0,
            page,
            pageSize,
            sort,
            ftsTokenizer,
        });
    }

    {
        const whereSql = filters.where.length ? `WHERE ${filters.where.join(" AND ")}` : "";

        const totalRow = db
            .prepare(`SELECT COUNT(*) AS n FROM questions q ${whereSql}`)
            .get(...filters.args) as { n: number } | undefined;

        const rows = db
            .prepare(`
                SELECT q.id, q.body, q.explanation, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
                FROM questions q
                ${whereSql}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `)
            .all(...filters.args, pageSize, offset) as repo.ItemRow[];

        return jsonOk({
            items: rows.map(repo.mapRow),
            mode: "all" as const,
            total: totalRow?.n ?? 0,
            page,
            pageSize,
            sort,
        });
    }
}

export async function POST(req: Request) {
    const bodyRead = await readJsonBodySafe(req, 1_000_000);
    if (!bodyRead.ok) return jsonInvalidPayloadFromBodyRead(bodyRead);

    const parsed = CreateAnySchema.safeParse(bodyRead.data);
    if (!parsed.success) return jsonError(400, { error: "invalid payload", details: parsed.error.flatten() });

    const built = service.buildCreatePayload(parsed.data);
    if (!built.ok) return jsonError(400, { error: "invalid payload", details: { body: "empty" } });

    const row = repo.insertOne({
        body: built.body,
        explanation: built.explanation,
        answerJson: built.answerJson,
        tagsJson: built.tagsJson,
        thumbsJson: built.thumbsJson,
    });

    const item = row ? repo.mapRow(row) : null;
    return jsonOk({ item }, { status: 201 });
}
