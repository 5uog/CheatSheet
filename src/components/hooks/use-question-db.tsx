// FILE: src/components/hooks/use-question-db.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnswerJson, Item, Kind, Mode, SortKey } from "../lib/question-types";
import { normalizeTags, normalizeThumbs, uniqTrim } from "../lib/question-utils";
import { apiCreateQuestion, apiDeleteQuestion, apiGetMeta, apiListQuestions, apiUploadImages } from "../lib/question-api";
import { useToast } from "@/components/ui/toast";
import { buildExportJson } from "../lib/editor-utils";

export function useQuestionDb() {
    const toast = useToast();

    const [q, setQ] = useState("");
    const [appliedQ, setAppliedQ] = useState("");

    const [mode, setMode] = useState<Mode>("all");
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);

    const [total, setTotal] = useState(0);
    const [sort, setSort] = useState<SortKey>("id_desc");
    const [pageSize, setPageSize] = useState<10 | 30 | 50 | 100>(30);
    const [page, setPage] = useState(1);

    const [filterTag, setFilterTag] = useState<string>("");
    const [kindFilter, setKindFilter] = useState<"" | Kind>("");
    const [boolOnly, setBoolOnly] = useState<"" | "true" | "false">("");

    const [error, setError] = useState<string | null>(null);
    const [tokenizer, setTokenizer] = useState<string>("");

    // ---- backward compatible mutation toggles ----
    const [mutationNonce, setMutationNonce] = useState(0);
    const bumpMutation = useCallback(() => setMutationNonce((x) => x + 1), []);

    // Create state
    const [newBody, setNewBody] = useState("");
    const [newKind, setNewKind] = useState<Exclude<Kind, "blank">>("boolean");

    const [createTagInput, setCreateTagInput] = useState("");
    const [createTags, setCreateTags] = useState<string[]>([]);

    const [createThumbUrl, setCreateThumbUrl] = useState("");
    const [createThumbs, setCreateThumbs] = useState<string[]>([]);
    const [createUploading, setCreateUploading] = useState(false);

    const [newOptions, setNewOptions] = useState<string[]>([""]);
    const [newCorrectIndices, setNewCorrectIndices] = useState<number[]>([]);
    const [newCorrectText, setNewCorrectText] = useState<string>("");

    const [saving, setSaving] = useState(false);

    const inFlightRef = useRef<AbortController | null>(null);

    function maxPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    function clampPage(n: number) {
        const m = maxPages();
        return Math.max(1, Math.min(m, n));
    }

    const fetchMeta = useCallback(async () => {
        const r = await apiGetMeta();
        if (r.ok) setTokenizer(r.data.ftsTokenizer ?? "");
    }, []);

    const fetchItems = useCallback(
        async (query: string, pageNo: number) => {
            inFlightRef.current?.abort();
            const ac = new AbortController();
            inFlightRef.current = ac;

            setLoading(true);
            setError(null);
            try {
                const r = await apiListQuestions(
                    {
                        q: query,
                        page: pageNo,
                        pageSize,
                        sort,
                        tag: filterTag,
                        kind: kindFilter,
                        boolOnly,
                    },
                    ac.signal
                );

                if (!r.ok) {
                    setError(r.error);
                    return;
                }

                setItems(r.data.items);
                setMode(r.data.mode);
                setTotal(r.data.total);
            } catch (e) {
                if ((e as { name?: string } | null)?.name !== "AbortError") setError("Request failed.");
            } finally {
                setLoading(false);
            }
        },
        [pageSize, sort, filterTag, kindFilter, boolOnly]
    );

    function resetCreateStateForKind(k: Exclude<Kind, "blank">) {
        if (k === "boolean") {
            setNewOptions(["True", "False"]);
            setNewCorrectIndices([0]);
            setNewCorrectText("");
        } else if (k === "choice") {
            setNewOptions([""]);
            setNewCorrectIndices([]);
            setNewCorrectText("");
        } else {
            setNewOptions([]);
            setNewCorrectIndices([]);
            setNewCorrectText("");
        }
    }

    useEffect(() => {
        resetCreateStateForKind(newKind);
    }, [newKind]);

    function addCreateTagFromInput() {
        const t = createTagInput.trim();
        if (!t) return;
        setCreateTags((xs) => normalizeTags([...xs, t]));
        setCreateTagInput("");
    }

    function addCreateThumbFromInput() {
        const u = createThumbUrl.trim();
        if (!u) return;
        setCreateThumbs((xs) => normalizeThumbs([...xs, u]));
        setCreateThumbUrl("");
    }

    async function uploadCreateFiles(files: FileList | null) {
        if (!files || files.length === 0) return;

        setCreateUploading(true);
        setError(null);
        try {
            const r = await apiUploadImages(files);
            if (!r.ok) {
                setError(r.error);
                toast.push({ kind: "error", message: `アップロードに失敗しました: ${r.error}` });
                return;
            }
            if (r.data.urls.length) {
                setCreateThumbs((xs) => normalizeThumbs([...xs, ...r.data.urls]));
                toast.push({ kind: "success", message: `アップロードしました（${r.data.urls.length}件）` });
            } else {
                toast.push({ kind: "error", message: "アップロードに失敗しました: 有効な画像がありません" });
            }
        } finally {
            setCreateUploading(false);
        }
    }

    async function onSearch(e: React.FormEvent) {
        e.preventDefault();
        const nextPage = 1;
        setPage(nextPage);
        setAppliedQ(q);
        await fetchItems(q, nextPage);
    }

    async function onReset() {
        setQ("");
        setAppliedQ("");
        setFilterTag("");
        setKindFilter("");
        setBoolOnly("");
        setSort("id_desc");
        setPageSize(30);
        const nextPage = 1;
        setPage(nextPage);
        await fetchItems("", nextPage);
    }

    function buildCreateAnswer(): AnswerJson {
        if (newKind === "boolean") {
            const idx = newCorrectIndices.length ? newCorrectIndices[0] : 0;
            return { type: "boolean", value: idx === 0 ? 1 : 0 };
        }
        if (newKind === "choice") {
            const options = uniqTrim(newOptions.map((s) => (s ?? "").trim())).slice(0, 200);
            const maxIdx = options.length - 1;
            const corr = Array.from(new Set(newCorrectIndices.map((n) => Math.trunc(Number(n))).filter(Number.isFinite)))
                .filter((n) => n >= 0 && n <= maxIdx)
                .slice(0, 200);
            return {
                type: "choice",
                options: options.length ? options : ["(option)"],
                correct: corr.length ? corr : [0],
            };
        }
        return { type: "text", value: (newCorrectText ?? "").trim() };
    }

    async function fetchAllQuestionsRobust(): Promise<Item[]> {
        const pageSize = 200;

        const first = await apiListQuestions({
            q: "",
            page: 1,
            pageSize,
            sort: "id_asc",
            tag: "",
            kind: "",
            boolOnly: "",
        });

        if (!first.ok) throw new Error(first.error);

        const total = Math.max(0, Number(first.data.total) || 0);
        const pages = Math.max(1, Math.ceil(total / pageSize));

        const all: Item[] = [...(first.data.items ?? [])];

        for (let p = 2; p <= pages; p++) {
            const r = await apiListQuestions({
                q: "",
                page: p,
                pageSize,
                sort: "id_asc",
                tag: "",
                kind: "",
                boolOnly: "",
            });
            if (!r.ok) throw new Error(r.error);
            all.push(...(r.data.items ?? []));
        }

        return all;
    }

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();

        const body = newBody.trim();
        if (!body) return;

        const tags = normalizeTags(createTags);
        const thumbnails = normalizeThumbs(createThumbs);
        const answer = buildCreateAnswer();

        try {
            const all = await fetchAllQuestionsRobust();

            const exists = all.some((it) => (it.body ?? "").trim() === body && it.answer?.type === answer.type);
            if (exists) {
                toast.push({ kind: "info", message: "既に存在します（body と answer type が一致）" });
                return;
            }

            setSaving(true);
            setError(null);

            const r = await apiCreateQuestion({ body, answer, tags, thumbnails });

            if (!r.ok) {
                if (r.status === 409) toast.push({ kind: "info", message: "既に存在します（サーバ側判定）" });
                else toast.push({ kind: "error", message: `作成に失敗しました: ${r.error}` });
                setError(r.error);
                return;
            }

            setNewBody("");
            setNewKind("boolean");
            resetCreateStateForKind("boolean");

            setCreateTagInput("");
            setCreateTags([]);
            setCreateThumbUrl("");
            setCreateThumbs([]);

            setNewOptions(["True", "False"]);
            setNewCorrectIndices([0]);
            setNewCorrectText("");

            bumpMutation();

            setPage(1);
            await fetchItems(appliedQ, 1);

            toast.push({ kind: "success", message: "作成しました" });
        } finally {
            setSaving(false);
        }
    }

    async function onDelete(id: number) {
        setError(null);

        const prev = items;
        setItems((xs) => xs.filter((x) => x.id !== id));

        const r = await apiDeleteQuestion(id);
        if (!r.ok) {
            setItems(prev);
            setError(r.error);
            toast.push({ kind: "error", message: `削除に失敗しました: ${r.error}` });
            return;
        }

        bumpMutation();

        const next = clampPage(page);
        setPage(next);
        await fetchItems(appliedQ, next);

        toast.push({ kind: "success", message: "削除しました" });
    }

    const loadCurrentEditorJson = useCallback(async () => {
        const all = await (async () => {
            // reuse robust full export (used by editor panel too)
            return await fetchAllQuestionsRobust();
        })();
        return buildExportJson(all);
    }, []);

    const reactiveKey = useMemo(() => {
        return [appliedQ, sort, pageSize, page, filterTag, kindFilter, boolOnly].join("|");
    }, [appliedQ, sort, pageSize, page, filterTag, kindFilter, boolOnly]);

    useEffect(() => {
        void fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        const next = clampPage(page);
        if (next !== page) {
            setPage(next);
            return;
        }
        void fetchItems(appliedQ, next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reactiveKey]);

    return {
        tokenizer,

        q,
        setQ,
        appliedQ,
        mode,
        items,
        setItems,
        loading,
        total,
        sort,
        setSort,
        pageSize,
        setPageSize,
        page,
        setPage,
        filterTag,
        setFilterTag,
        kindFilter,
        setKindFilter,
        boolOnly,
        setBoolOnly,
        error,
        setError,

        // compat exports
        mutationNonce,
        bumpMutation,
        loadCurrentEditorJson,
        loadCurrentJson: loadCurrentEditorJson,

        newBody,
        setNewBody,
        newKind,
        setNewKind,

        createTagInput,
        setCreateTagInput,
        createTags,
        setCreateTags,
        createThumbUrl,
        setCreateThumbUrl,
        createThumbs,
        setCreateThumbs,
        createUploading,

        newOptions,
        setNewOptions,
        newCorrectIndices,
        setNewCorrectIndices,
        newCorrectText,
        setNewCorrectText,
        saving,

        fetchItems,
        onSearch,
        onReset,
        onCreate,
        onDelete,
        addCreateTagFromInput,
        addCreateThumbFromInput,
        uploadCreateFiles,

        maxPages,
        clampPage,
    };
}
