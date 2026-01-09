/**
 * FILE: src/app/lib/uploads/naming.ts
 *
 * This module owns transport-facing naming for persisted upload blobs. It generates unique
 * basenames using time and cryptographic randomness and renders stable API URLs that address those
 * basenames through the uploads route. The helpers keep URL encoding and naming conventions
 * centralized so callers do not reimplement address construction.
 */

import crypto from "node:crypto";

export function makeBasename(ext: string): string {
    const id = crypto.randomBytes(16).toString("hex");
    const safeExt = (ext || "").startsWith(".") ? ext : ext ? `.${ext}` : "";
    return `${Date.now()}_${id}${safeExt}`;
}

export function toPublicUrl(name: string): string {
    return `/api/uploads/${encodeURIComponent(name)}`;
}
