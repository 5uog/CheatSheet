// FILE: src/components/lib/question-utils.ts
import type { Item, Kind } from "./question-types";

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

export function formatCorrect(it: Item): string {
    const a = it.answer;
    if (a.type === "boolean") return a.value === 1 ? "Correct: True" : "Correct: False";
    if (a.type === "choice") {
        const idxs = Array.isArray(a.correct) ? a.correct : [];
        if (!idxs.length) return "Correct: (unset)";
        const labels = idxs.map((i) => `#${i + 1}`);
        return `Correct: ${labels.join(", ")}`;
    }
    if (a.type === "blank") return a.value?.trim() ? `Correct: ${a.value}` : "Correct: (free)";
    return a.value?.trim() ? `Correct: ${a.value}` : "Correct: (free)";
}

export function buildHelpText() {
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
