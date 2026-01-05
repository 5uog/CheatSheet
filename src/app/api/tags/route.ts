// FILE: src/app/api/tags/route.ts
import { db } from "@/app/lib/db";
import { jsonOk } from "@/app/api/_shared/http";
import { safeJsonEach } from "@/app/api/_shared/sql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const rows = db
        .prepare(`
            SELECT DISTINCT je.value AS tag
            FROM questions q
            JOIN ${safeJsonEach("q.tags_json")} je
            ORDER BY tag COLLATE NOCASE ASC
        `)
        .all() as Array<{ tag: string }>;

    return jsonOk({ tags: rows.map((r) => r.tag).filter((x) => typeof x === "string" && x.trim() !== "") });
}
