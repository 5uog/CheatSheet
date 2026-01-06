/**
 * FILE: src/app/api/uploads/route.ts
 *
 * This route module implements a bounded multipart upload intake for image files. It rejects
 * non-multipart requests, limits the number of uploaded parts, and delegates file validation and
 * persistence to the uploads library, which enforces extension and size caps before writing to the
 * local uploads directory. On success it returns the set of addressable URLs for the stored blobs,
 * using shared JSON response helpers to keep response shaping consistent across API routes.
 *
 * When the client supplies a Content-Length header, the handler applies an early total-size gate
 * to reject obviously oversized uploads before parsing multipart form data.
 */

import { jsonError, jsonOk } from "@/app/api/_shared/http";
import { saveUploadedFiles, MAX_UPLOAD_FILES, MAX_UPLOAD_TOTAL_BYTES } from "@/app/lib/uploads";

function getContentLength(req: Request): number | null {
    const v = req.headers.get("content-length");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
        return jsonError(400, { error: "invalid content-type" });
    }

    const cl = getContentLength(req);
    if (cl != null && cl > MAX_UPLOAD_TOTAL_BYTES) {
        return jsonError(413, { error: "payload too large" });
    }

    const fd = await req.formData().catch(() => null);
    if (!fd) {
        return jsonError(400, { error: "invalid form data" });
    }

    const files = fd.getAll("files");
    if (!files || files.length === 0) {
        return jsonError(400, { error: "no files" });
    }

    if (files.length > MAX_UPLOAD_FILES) {
        return jsonError(400, { error: "too many files" });
    }

    const saved = await saveUploadedFiles(files);

    if (saved.length === 0) {
        return jsonError(400, { error: "no valid files" });
    }

    return jsonOk({ urls: saved });
}
