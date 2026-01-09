/**
 * FILE: src/app/lib/uploads/index.ts
 *
 * This module is the stable public entrypoint for the uploads subsystem. It re-exports the policy
 * constants and safety helpers used by route modules, and it provides the canonical persistence
 * procedure that validates candidate files, materializes their bytes, and writes them to storage
 * under generated basenames. Successful writes are returned as addressable API URLs suitable for
 * client consumption.
 */

import { isFileLike } from "@/app/lib/uploads/types";
import { safeExt, MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILES } from "@/app/lib/uploads/policy";
import { makeBasename, toPublicUrl } from "@/app/lib/uploads/naming";
import { writeUploadFile } from "@/app/lib/uploads/storage";

export { MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILES, MAX_UPLOAD_TOTAL_BYTES, safeExt } from "@/app/lib/uploads/policy";
export { contentTypeFor } from "@/app/lib/uploads/content-type";
export { isSafeBasename, decodeUploadBasename } from "@/app/lib/uploads/path-safety";
export { readUploadFile } from "@/app/lib/uploads/storage";

export async function saveUploadedFiles(files: unknown[]): Promise<string[]> {
    const saved: string[] = [];

    const limited = files.slice(0, MAX_UPLOAD_FILES);

    for (const f of limited) {
        if (!isFileLike(f)) continue;
        if (f.size <= 0) continue;
        if (f.size > MAX_UPLOAD_FILE_BYTES) continue;

        const ext = safeExt(f.name);
        if (!ext) continue;

        const buf = new Uint8Array(await f.arrayBuffer());
        if (buf.byteLength <= 0) continue;
        if (buf.byteLength > MAX_UPLOAD_FILE_BYTES) continue;

        const name = makeBasename(ext);

        const ok = writeUploadFile(name, buf);
        if (!ok) continue;

        saved.push(toPublicUrl(name));
    }

    return saved;
}
