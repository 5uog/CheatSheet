/**
 * FILE: src/app/api/meta/route.ts
 *
 * This route module exposes a minimal introspection endpoint that reports the tokenizer selected
 * by the local SQLite FTS5 configuration. It performs no persistence, mutation, or request-body
 * ingestion, and it relies on shared JSON response helpers to produce a consistently shaped,
 * no-store response suitable for debugging and operational visibility.
 */

import { ftsTokenizer } from "@/app/lib/db";
import { jsonOk } from "@/app/api/_shared/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return jsonOk({ ftsTokenizer });
}
