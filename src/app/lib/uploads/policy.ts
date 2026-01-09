/**
 * FILE: src/app/lib/uploads/policy.ts
 *
 * This module codifies the acceptance policy for image uploads, including the set of allowed file
 * extensions and strict size and count caps designed to prevent unbounded memory usage when the
 * route layer materializes multipart form data. The policy surface is pure and deterministic: it
 * maps filenames to a permitted extension and exposes constant limits so both the route layer and
 * storage pipeline can enforce the same constraints without duplicating literals.
 */

import path from "node:path";

export const ALLOWED_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export const MAX_UPLOAD_FILE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_UPLOAD_FILES = 20;

export const MAX_UPLOAD_TOTAL_BYTES = MAX_UPLOAD_FILES * MAX_UPLOAD_FILE_BYTES + 2 * 1024 * 1024; // +2MB overhead

export function safeExt(filename: string): string {
    const ext = path.extname(filename || "").toLowerCase();
    if (!ext) return "";
    return ALLOWED_EXTS.has(ext) ? ext : "";
}
