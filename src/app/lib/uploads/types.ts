/**
 * FILE: src/app/lib/uploads/types.ts
 *
 * This module defines the minimal structural contract required from multipart form entries to be
 * treated as uploadable files by the uploads subsystem. It provides a narrow type guard that
 * accepts Web File-compatible objects by checking only the properties that are actually consumed
 * by the persistence pipeline, avoiding framework-specific imports while keeping validation total
 * with respect to unknown inputs.
 */

export type FileLike = {
    name?: unknown;
    size?: unknown;
    arrayBuffer?: unknown;
};

export function isFileLike(x: unknown): x is Required<Pick<File, "name" | "size" | "arrayBuffer">> {
    const f = x as FileLike | null;
    return !!f && typeof f.name === "string" && typeof f.size === "number" && typeof f.arrayBuffer === "function";
}
