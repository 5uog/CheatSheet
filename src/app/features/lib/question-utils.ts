// FILE: src/app/features/lib/question-utils.ts
import type { Item, Kind } from "@/app/features/lib/question-types";

export function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

export async function readJsonSafe<T>(res: Response): Promise<T | null> {
    try {
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export function uniqTrim(xs: string[]) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of xs) {
        const s = (x ?? "").trim();
        if (!s) continue;
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

export function normalizeTags(arr: string[]) {
    return Array.from(new Set(arr.map((x) => (x ?? "").trim()).filter(Boolean))).slice(0, 200);
}

export function normalizeThumbs(arr: string[]) {
    return Array.from(new Set(arr.map((x) => (x ?? "").trim()).filter(Boolean))).slice(0, 200);
}

export function normalizeExplanation(s: string) {
    const v = (s ?? "").trim();
    return v.slice(0, 20000);
}

export function isImageUrl(u: string) {
    const s = (u ?? "").trim().toLowerCase();
    return (
        s.startsWith("http://") ||
        s.startsWith("https://") ||
        s.startsWith("blob:") ||
        s.startsWith("data:image/") ||
        s.includes("/api/uploads/")
    );
}

export function isProbablyImageUrl(u: string) {
    const s = (u ?? "").trim().toLowerCase();
    return (
        s.startsWith("http://") ||
        s.startsWith("https://") ||
        s.startsWith("blob:") ||
        s.startsWith("data:image/") ||
        s.endsWith(".png") ||
        s.endsWith(".jpg") ||
        s.endsWith(".jpeg") ||
        s.endsWith(".webp") ||
        s.endsWith(".gif") ||
        s.endsWith(".avif") ||
        s.endsWith(".svg") ||
        s.includes("/api/uploads/")
    );
}

export function answerKind(it: Item): Kind {
    return it.answer.type;
}

type TFunc<K extends string = string> = (key: K, vars?: Record<string, string | number>) => string;

export function formatCorrect<K extends string>(it: Item, t?: TFunc<K>): string {
    const a = it.answer;

    const tr = (key: K, vars?: Record<string, string | number>) => {
        if (!t) return "";
        return t(key, vars);
    };

    if (a.type === "boolean") {
        if (t)
            return a.value === 1
                ? `${tr("edit.answer" as K)}: ${tr("edit.answer.true" as K)}`
                : `${tr("edit.answer" as K)}: ${tr("edit.answer.false" as K)}`;
        return a.value === 1 ? "Correct: True" : "Correct: False";
    }

    if (a.type === "choice") {
        const idxs = Array.isArray(a.correct) ? a.correct : [];
        if (!idxs.length) return t ? `${tr("edit.answer" as K)}: (unset)` : "Correct: (unset)";
        const labels = idxs.map((i) => `#${i + 1}`);
        return t ? `${tr("edit.answer" as K)}: ${labels.join(", ")}` : `Correct: ${labels.join(", ")}`;
    }

    if (a.type === "blank")
        return a.value?.trim()
            ? t
                ? `${tr("edit.answer" as K)}: ${a.value}`
                : `Correct: ${a.value}`
            : t
                ? `${tr("edit.answer" as K)}: (free)`
                : "Correct: (free)";

    return a.value?.trim()
        ? t
            ? `${tr("edit.answer" as K)}: ${a.value}`
            : `Correct: ${a.value}`
        : t
            ? `${tr("edit.answer" as K)}: (free)`
            : "Correct: (free)";
}

export function buildHelpText(lang: "ja" | "en" = "ja") {
    if (lang === "ja") {
        return [
            "Query DSL（日本語 + 英数字 + 記号に対応）",
            "",
            "AND: 右折 安全確認  /  right-turn safety-check",
            "OR: 徐行 OR 一時停止  /  stop|yield",
            'Phrase: "合図は3秒前"  /  "exact phrase"',
            "Exclude: 右折 -二段階  /  right-turn -two-stage",
            "Wildcard（prefix）: 交差*  /  intersec*",
            "Exact full-body match: =full body text",
            "Parentheses: (徐行 OR 一時停止) -標識",
            "",
            'Fallback LIKE: クエリ先頭に "~"（短い語／記号に有用）',
            '例: ~右折  /  ~"安全確認"  /  ~AB -CD  /  ~"!?"/  ~@ -#',
        ].join("\n");
    }

    return [
        "Query DSL (works for Japanese + Latin text + symbols)",
        "",
        "AND: 右折 安全確認  /  right-turn safety-check",
        "OR: 徐行 OR 一時停止  /  stop|yield",
        'Phrase: "合図は3秒前"  /  "exact phrase"',
        "Exclude: 右折 -二段階  /  right-turn -two-stage",
        "Wildcard (prefix): 交差*  /  intersec*",
        "Exact full-body match: =full body text",
        "Parentheses: (徐行 OR 一時停止) -標識",
        "",
        'Fallback LIKE: prefix query with "~" (useful for very short terms / symbols)',
        'Example: ~右折  /  ~"安全確認"  /  ~AB -CD  /  ~"!?"/  ~@ -#',
    ].join("\n");
}
