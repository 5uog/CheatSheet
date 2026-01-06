// FILE: src/app/features/lib/question-fetch-all.ts
import type { Item, SortKey } from "@/app/features/lib/question-types";
import { apiListQuestions } from "@/app/features/lib/question-api";

export async function fetchAllQuestions(params?: {
    pageSize?: number;
    sort?: SortKey;
    q?: string;
    tag?: string;
    kind?: "" | Item["answer"]["type"];
    boolOnly?: "" | "true" | "false";
}): Promise<Item[]> {
    const all: Item[] = [];
    const pageSize = Math.max(10, Math.min(200, params?.pageSize ?? 100));
    const sort = (params?.sort ?? "id_asc") as SortKey;

    let page = 1;

    while (true) {
        const r = await apiListQuestions({
            q: (params?.q ?? "").trim(),
            page,
            pageSize,
            sort,
            tag: (params?.tag ?? "").trim(),
            kind: (params?.kind ?? "") as "" | Item["answer"]["type"],
            boolOnly: (params?.boolOnly ?? "") as "" | "true" | "false",
        });

        if (!r.ok) throw new Error(r.error);

        const chunk = r.data.items ?? [];
        all.push(...chunk);

        if (chunk.length < pageSize) break;
        page += 1;
    }

    return all;
}
