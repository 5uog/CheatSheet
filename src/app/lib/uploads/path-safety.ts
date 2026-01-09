/**
 * FILE: src/app/lib/uploads/path-safety.ts
 *
 * This module implements path-safety checks for upload blob addressing by validating that a
 * caller-supplied name decodes into a single basename and cannot express traversal through dot-dot
 * segments or path separators. The validator is designed to run before any filesystem access so
 * route handlers and storage routines can deterministically reject unsafe names without depending
 * on platform-specific path resolution behavior.
 */

import path from "node:path";

function decodeSafe(s: string): string | null {
    try {
        return decodeURIComponent(s);
    } catch {
        return null;
    }
}

export function decodeUploadBasename(name: string): string | null {
    return decodeSafe(name || "");
}

export function isSafeBasename(name: string): boolean {
    const decoded = decodeSafe(name || "");
    if (!decoded) return false;
    if (decoded.includes("..")) return false;
    if (decoded.includes("/") || decoded.includes("\\")) return false;
    if (path.basename(decoded) !== decoded) return false;
    return true;
}
