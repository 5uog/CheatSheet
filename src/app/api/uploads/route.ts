// FILE: src/app/api/uploads/route.ts
import { jsonError, jsonOk } from "@/app/api/_shared/http";
import { saveUploadedFiles, MAX_UPLOAD_FILES } from "@/app/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
        return jsonError(400, { error: "invalid content-type" });
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
