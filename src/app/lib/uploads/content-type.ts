/**
 * FILE: src/app/lib/uploads/content-type.ts
 *
 * This module provides a small content-type classifier for persisted upload blobs based on file
 * extension. The mapping is intentionally conservative and returns a generic octet-stream type for
 * unexpected extensions, allowing callers to construct responses without relying on sniffing or
 * attempting to infer types from bytes at runtime.
 */

import path from "node:path";

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
