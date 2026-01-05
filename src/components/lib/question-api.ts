// FILE: src/components/lib/question-api.ts
import type { AnswerJson, Item, Mode, SortKey, Kind } from "./question-types";
import { readJsonSafe } from "./question-utils";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

function errMsg(status: number, fallback: string) {
    return `${fallback} (${status})`;
}

export async function apiGetMeta(): Promise<ApiResult<{ ftsTokenizer?: string }>> {
    const res = await fetch("/api/meta", { cache: "no-store" });
    const json = await readJsonSafe<{ ftsTokenizer?: string; error?: string }>(res);
    if (!res.ok) return { ok: false, error: json?.error ?? errMsg(res.status, "Meta request failed"), status: res.status };
    return { ok: true, data: { ftsTokenizer: json?.ftsTokenizer } };
}

export type ListParams = {
    q: string;
    page: number;
    pageSize: number;
    sort: SortKey;
    tag?: string;
    kind?: "" | Kind;
    boolOnly?: "" | "true" | "false";
};

export async function apiListQuestions(
    params: ListParams,
    signal?: AbortSignal
): Promise<ApiResult<{ items: Item[]; mode: Mode; total: number }>> {
    const sp = new URLSearchParams();
    sp.set("q", params.q);
    sp.set("pageSize", String(params.pageSize));
    sp.set("page", String(params.page));
    sp.set("sort", params.sort);

    const t = (params.tag ?? "").trim();
    if (t) sp.set("tag", t);

    if (params.kind) sp.set("kind", params.kind);

    if (params.boolOnly) sp.set("boolOnly", params.boolOnly);

    const res = await fetch(`/api/questions?${sp.toString()}`, { cache: "no-store", signal });
    const json = await readJsonSafe<{
        items?: Item[];
        mode?: Mode;
        error?: string;
        total?: number;
        page?: number;
        pageSize?: number;
        sort?: SortKey;
    }>(res);

    if (!res.ok) return { ok: false, error: json?.error ?? errMsg(res.status, "Request failed"), status: res.status };

    return {
        ok: true,
        data: {
            items: Array.isArray(json?.items) ? (json!.items as Item[]) : [],
            mode: json?.mode ?? "all",
            total: typeof json?.total === "number" ? json.total : 0,
        },
    };
}

export async function apiCreateQuestion(payload: {
    id?: number; // optional preferred ID (gap-fill / stable import)
    body: string;
    answer: AnswerJson;
    tags?: string[];
    thumbnails?: string[];
}): Promise<ApiResult<{ item?: Item }>> {
    const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    const json = await readJsonSafe<{ item?: Item; error?: string }>(res);

    if (!res.ok) {
        // preserve status (e.g. 409 already exists)
        return { ok: false, error: json?.error ?? errMsg(res.status, "Create failed"), status: res.status };
    }
    return { ok: true, data: { item: json?.item } };
}

export async function apiUpdateQuestion(
    id: number,
    payload: { body: string; answer: AnswerJson; tags?: string[]; thumbnails?: string[] }
): Promise<ApiResult<{ item?: Item }>> {
    const res = await fetch(`/api/questions/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    const json = await readJsonSafe<{ item?: Item; error?: string }>(res);
    if (!res.ok) return { ok: false, error: json?.error ?? errMsg(res.status, "Update failed"), status: res.status };
    return { ok: true, data: { item: json?.item } };
}

export async function apiDeleteQuestion(id: number): Promise<ApiResult<{ ok?: boolean }>> {
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE", cache: "no-store" });
    const json = await readJsonSafe<{ ok?: boolean; error?: string }>(res);
    if (!res.ok) return { ok: false, error: json?.error ?? errMsg(res.status, "Delete failed"), status: res.status };
    return { ok: true, data: { ok: json?.ok } };
}

export async function apiUploadImages(files: FileList | File[]): Promise<ApiResult<{ urls: string[] }>> {
    const arr = Array.isArray(files) ? files : Array.from(files);
    if (arr.length === 0) return { ok: true, data: { urls: [] } };

    const fd = new FormData();
    for (const f of arr) fd.append("files", f);

    const res = await fetch("/api/uploads", { method: "POST", body: fd, cache: "no-store" });
    const json = await readJsonSafe<{ urls?: string[]; error?: string }>(res);

    if (!res.ok) return { ok: false, error: json?.error ?? errMsg(res.status, "Upload failed"), status: res.status };

    const urls = Array.isArray(json?.urls) ? (json!.urls as string[]) : [];
    return { ok: true, data: { urls } };
}
