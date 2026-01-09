/**
 * FILE: src/app/lib/uploads/storage.ts
 *
 * This module isolates filesystem I/O for the uploads subsystem. It resolves validated basenames
 * under the process-local uploads directory, performs existence and file-type checks, and reads or
 * writes raw bytes without embedding acceptance policy. By concentrating I/O here, higher layers
 * can keep their logic deterministic while future storage backends can be introduced by replacing
 * this module's implementation.
 */

import fs from "node:fs";
import path from "node:path";
import { uploadsPath } from "@/app/lib/db";
import { contentTypeFor } from "@/app/lib/uploads/content-type";
import { decodeUploadBasename, isSafeBasename } from "@/app/lib/uploads/path-safety";

export function readUploadFile(name: string): { data: Buffer; contentType: string } | null {
    if (!isSafeBasename(name)) return null;

    const decoded = decodeUploadBasename(name || "");
    if (!decoded) return null;

    const p = path.join(uploadsPath, decoded);
    if (!fs.existsSync(p)) return null;

    const st = fs.statSync(p);
    if (!st.isFile()) return null;

    const data = fs.readFileSync(p);
    return { data, contentType: contentTypeFor(decoded) };
}

export function writeUploadFile(name: string, data: Uint8Array): boolean {
    if (!isSafeBasename(name)) return false;

    const decoded = decodeUploadBasename(name || "");
    if (!decoded) return false;

    const p = path.join(uploadsPath, decoded);

    try {
        fs.writeFileSync(p, Buffer.from(data));
        return true;
    } catch {
        return false;
    }
}
