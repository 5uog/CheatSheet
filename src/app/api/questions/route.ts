// FILE: src/app/api/questions/route.ts
import { db, ftsTokenizer } from "@/app/lib/db";
import { jsonInvalidPayload, jsonOk } from "@/app/api/_shared/http";
import { readJsonBodySafe } from "@/app/api/_shared/body";
import { CreateAnySchema, normalizeStringArray } from "./_schemas";
import { isKind, parsePaging, parseSort, buildFilters } from "./_query";
import * as service from "./_service";
import * as repo from "./_repo";

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
                SELECT q.id, q.body, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
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
                SELECT q.id, q.body, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
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
        // IMPORTANT:
        // SQLite FTS MATCH does NOT reliably accept table aliases on the left operand.
        // Use the real virtual table name (questions_fts) for MATCH, even if we alias it in FROM.
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
                SELECT q.id, q.body, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
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
                SELECT q.id, q.body, q.answer_json, q.tags_json, q.thumbs_json, q.created_at, q.updated_at
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
    if (!bodyRead.ok) {
        const reason =
            bodyRead.error === "too_large"
                ? { body: "too large" }
                : bodyRead.error === "empty"
                    ? { body: "empty" }
                    : { body: "invalid json" };
        return jsonInvalidPayload(reason);
    }

    const parsed = CreateAnySchema.safeParse(bodyRead.data);

    if (!parsed.success) {
        return jsonInvalidPayload(parsed.error.flatten());
    }

    const body = parsed.data.body.trim();
    if (!body) {
        return jsonInvalidPayload({ body: "empty" });
    }

    const { answerJson } = service.buildCreateAnswer(parsed.data);

    const tags = normalizeStringArray(parsed.data.tags ?? [], 200);
    const thumbs = normalizeStringArray(parsed.data.thumbnails ?? [], 200);

    const row = repo.insertOne({
        body,
        answerJson,
        tagsJson: JSON.stringify(tags),
        thumbsJson: JSON.stringify(thumbs),
    });

    const item = row ? repo.mapRow(row) : null;

    return jsonOk({ item }, { status: 201 });
}
