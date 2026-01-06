/**
 * FILE: src/app/api/uploads/[name]/route.ts
 *
 * This route module serves previously stored upload blobs by a validated basename key. It performs
 * strict path-safety checks to prevent traversal, reads the corresponding file from the uploads
 * directory, and returns the raw bytes with an inferred content type. Responses are marked no-store
 * to avoid caching stale blobs when the underlying local filesystem state changes.
 */

import { NextResponse } from "next/server";
import { NO_STORE_HEADERS, jsonError } from "@/app/api/_shared/http";
import { readParams, type ParamsLike } from "@/app/api/_shared/params";
import { readUploadFile, isSafeBasename } from "@/app/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: ParamsLike<{ name: string }>) {
    const { name } = await readParams(ctx);

    if (!isSafeBasename(name || "")) {
        return jsonError(400, { error: "bad name" });
    }

    const f = readUploadFile(name);
    if (!f) {
        return jsonError(404, { error: "not found" });
    }

    const body = new Uint8Array(f.data);

    return new NextResponse(body, {
        status: 200,
        headers: {
            "content-type": f.contentType,
            ...NO_STORE_HEADERS,
        },
    });
}
