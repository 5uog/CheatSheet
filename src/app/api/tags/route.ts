/**
 * FILE: src/app/api/tags/route.ts
 *
 * This route module exposes a read-only endpoint that enumerates distinct tag values present in
 * the questions table. It derives tags by iterating the JSON array stored in the tags column via
 * a JSON1 table-valued function wrapped to tolerate malformed JSON, and it returns a no-store JSON
 * response suitable for driving UI filter affordances without introducing server-side caching of
 * potentially fast-changing local data.
 */

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
