// FILE: src/components/lib/question-types.ts
export type AnswerJson =
    | { type: "boolean"; value: 0 | 1 }
    | { type: "choice"; options: string[]; correct: number[] }
    | { type: "text"; value: string }
    | { type: "blank"; value: string };

export type Kind = AnswerJson["type"];

export type Item = {
    id: number;
    body: string;
    answer: AnswerJson;
    tags: string[];
    thumbnails: string[];
    created_at: string;
    updated_at: string;
};

export type Mode = "all" | "fts" | "exact" | "like";

export type SortKey =
    | "id_desc"
    | "id_asc"
    | "created_desc"
    | "created_asc"
    | "updated_desc"
    | "updated_asc";

export const SortKeys: readonly SortKey[] = [
    "id_desc",
    "id_asc",
    "created_desc",
    "created_asc",
    "updated_desc",
    "updated_asc",
] as const;

export function isKind(x: string): x is Kind {
    return x === "boolean" || x === "choice" || x === "text" || x === "blank";
}

export function isNewKind(x: string): x is Exclude<Kind, "blank"> {
    return x === "boolean" || x === "choice" || x === "text";
}

export function isSortKey(x: string): x is SortKey {
    return SortKeys.includes(x as SortKey);
}
