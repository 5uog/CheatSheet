/**
 * FILE: src/app/lib/uploads.ts
 *
 * This module implements local file upload persistence and retrieval utilities for API routes that
 * accept multipart form data. It defines a constrained file acceptance policy based on a fixed set
 * of image extensions and hard size limits, and it writes validated blobs into a dedicated uploads
 * directory under the application data path. For addressing, it generates unique basenames and
 * returns stable API URLs for later retrieval, while separate helpers validate basenames and reject
 * traversal attempts by disallowing path separators and dot-dot segments even after URL decoding.
 *
 * The route layer uses these limits to enforce an early Content-Length gate when available; the
 * library still defends itself by re-checking individual file sizes after materialization.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { uploadsPath } from "@/app/lib/db";

const ALLOWED_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

// Hard caps to avoid memory blowups from formData()/arrayBuffer()
export const MAX_UPLOAD_FILE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_UPLOAD_FILES = 20;

// Conservative upper bound for total request size (files + multipart overhead).
export const MAX_UPLOAD_TOTAL_BYTES = MAX_UPLOAD_FILES * MAX_UPLOAD_FILE_BYTES + 2 * 1024 * 1024; // +2MB overhead

export function safeExt(filename: string): string {
    const ext = path.extname(filename || "").toLowerCase();
    if (!ext) return "";
    return ALLOWED_EXTS.has(ext) ? ext : "";
}

export function contentTypeFor(name: string): string {
    const ext = path.extname(name).toLowerCase();
    switch (ext) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".webp":
            return "image/webp";
        case ".gif":
            return "image/gif";
        default:
            return "application/octet-stream";
    }
}

function decodeSafe(s: string): string | null {
    try {
        return decodeURIComponent(s);
    } catch {
        return null;
    }
}

export function isSafeBasename(name: string): boolean {
    const decoded = decodeSafe(name || "");
    if (!decoded) return false;
    if (decoded.includes("..")) return false;
    if (decoded.includes("/") || decoded.includes("\\")) return false;
    if (path.basename(decoded) !== decoded) return false;
    return true;
}

export function readUploadFile(name: string): { data: Buffer; contentType: string } | null {
    if (!isSafeBasename(name)) return null;

    const decoded = decodeSafe(name || "");
    if (!decoded) return null;

    const p = path.join(uploadsPath, decoded);
    if (!fs.existsSync(p)) return null;

    const st = fs.statSync(p);
    if (!st.isFile()) return null;

    const data = fs.readFileSync(p);
    return { data, contentType: contentTypeFor(decoded) };
}

type FileLike = {
    name?: unknown;
    size?: unknown;
    arrayBuffer?: unknown;
};

function isFileLike(x: unknown): x is Required<Pick<File, "name" | "size" | "arrayBuffer">> {
    const f = x as FileLike | null;
    return !!f && typeof f.name === "string" && typeof f.size === "number" && typeof f.arrayBuffer === "function";
}

export async function saveUploadedFiles(files: unknown[]): Promise<string[]> {
    const saved: string[] = [];

    const limited = files.slice(0, MAX_UPLOAD_FILES);

    for (const f of limited) {
        if (!isFileLike(f)) continue;
        if (f.size <= 0) continue;
        if (f.size > MAX_UPLOAD_FILE_BYTES) continue;

        const ext = safeExt(f.name);
        if (!ext) continue;

        const buf = Buffer.from(await f.arrayBuffer());
        if (buf.byteLength <= 0) continue;
        if (buf.byteLength > MAX_UPLOAD_FILE_BYTES) continue;

        const id = crypto.randomBytes(16).toString("hex");
        const name = `${Date.now()}_${id}${ext}`;
        const p = path.join(uploadsPath, name);

        fs.writeFileSync(p, buf);
        saved.push(`/api/uploads/${encodeURIComponent(name)}`);
    }

    return saved;
}
