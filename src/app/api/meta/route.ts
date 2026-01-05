// FILE: src/app/api/meta/route.ts
import { ftsTokenizer } from "@/app/lib/db";
import { jsonOk } from "@/app/api/_shared/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return jsonOk({ ftsTokenizer });
}
