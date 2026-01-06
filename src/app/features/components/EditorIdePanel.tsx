// FILE: src/app/features/components/EditorIdePanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cls } from "@/app/features/lib/question-utils";
import { useToast } from "@/app/shared/ui/ToastProvider";
import { apiCreateQuestion, apiDeleteQuestion, apiListQuestions } from "@/app/features/lib/question-api";
import { normalizeAnswer } from "@/app/features/lib/answer-utils";
import { buildExportJson, computeSignature, normalizeImportPayload, safeParseJson, type NormalizedImportItem } from "@/app/features/lib/editor-utils";
import { MonacoJsonEditor } from "@/app/shared/ui/MonacoJsonEditor";
import { useI18n } from "@/app/shared/i18n/client";

export type EditorDiagnostics = {
    jsonValid: boolean;
    jsonError?: string;
    importItemCount: number;
};

export function EditorIdePanel(props: {
    setError: (msg: string | null) => void;
    refreshList: () => Promise<void>;
    onDiagnostics?: (d: EditorDiagnostics) => void;
    asMain?: boolean;

    active?: boolean;
    mutationNonce?: number;
    loadCurrentJson?: () => Promise<string> | string;
    bumpMutation?: () => void;
}) {
    const { setError, refreshList, onDiagnostics, asMain = false, active = true, mutationNonce, loadCurrentJson } = props;

    const toast = useToast();
    const { t } = useI18n();

    const [loading, setLoading] = useState(false);
    const [text, setText] = useState("");
    const [mode, setMode] = useState<"replace" | "merge">("replace");

    const didInitRef = useRef(false);

    function emitDiagnostics(nextText: string) {
        const parsed = safeParseJson(nextText);
        if (!parsed.ok) {
            onDiagnostics?.({ jsonValid: false, jsonError: parsed.error, importItemCount: 0 });
            return;
        }
        const normalized = normalizeImportPayload(parsed.data, normalizeAnswer);
        onDiagnostics?.({ jsonValid: true, importItemCount: normalized.items.length });
    }

    async function fetchAllQuestionsRobust() {
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

        const all = [...(first.data.items ?? [])];

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

    async function refreshFromDb(opts?: { toast?: boolean }) {
        const showToast = opts?.toast !== false;

        setLoading(true);
        setError(null);
        try {
            const all = await fetchAllQuestionsRobust();
            const next = buildExportJson(all);
            setText(next);
            emitDiagnostics(next);
            if (showToast) toast.push({ kind: "success", message: t("editor.toast.export_ok", { n: all.length }) });
        } catch (e) {
            const msg = (e as Error | null)?.message ?? t("editor.export_failed");
            setError(msg);
            if (showToast) toast.push({ kind: "error", message: t("editor.toast.export_ng", { msg }) });
        } finally {
            setLoading(false);
        }
    }

    async function loadFromExternal() {
        if (!loadCurrentJson) return false;
        try {
            const v = await loadCurrentJson();
            const next = typeof v === "string" ? v : "";
            if (next.trim().length > 0) {
                setText(next);
                emitDiagnostics(next);
                return true;
            }
        } catch {}
        return false;
    }

    async function downloadJson() {
        const blob = new Blob([text || "{}"], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "questions-export.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function deleteAllExisting() {
        const all = await fetchAllQuestionsRobust();
        for (const it of all) {
            const r = await apiDeleteQuestion(it.id);
            if (!r.ok) throw new Error(r.error);
        }
        return all.length;
    }

    async function createOne(it: NormalizedImportItem) {
        const r = await apiCreateQuestion({
            body: it.body,
            answer: it.answer,
            explanation: it.explanation,
            tags: it.tags,
            thumbnails: it.thumbnails,
        } as never);
        if (!r.ok) throw new Error(r.error);
        return r;
    }

    async function mergeIntoExisting(importItems: NormalizedImportItem[]) {
        const existing = await fetchAllQuestionsRobust();
        const seen = new Set<string>();
        for (const it of existing) seen.add(computeSignature(it.body, it.answer));

        let added = 0;

        for (const it of importItems) {
            const sig = computeSignature(it.body, it.answer);
            if (seen.has(sig)) continue;

            await createOne(it);

            seen.add(sig);
            added += 1;
        }

        return { existing: existing.length, added };
    }

    async function replaceAll(importItems: NormalizedImportItem[]) {
        const removed = await deleteAllExisting();

        let created = 0;

        for (const it of importItems) {
            await createOne(it);
            created += 1;
        }

        return { removed, created };
    }

    async function apply() {
        const raw = text.trim();
        if (!raw) {
            setError(t("editor.json_empty"));
            onDiagnostics?.({ jsonValid: false, jsonError: t("editor.json_empty"), importItemCount: 0 });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const parsed = safeParseJson(raw);
            if (!parsed.ok) {
                setError(parsed.error);
                onDiagnostics?.({ jsonValid: false, jsonError: parsed.error, importItemCount: 0 });
                toast.push({ kind: "error", message: t("editor.toast.json_invalid", { msg: parsed.error }) });
                return;
            }

            const normalized = normalizeImportPayload(parsed.data, normalizeAnswer);
            onDiagnostics?.({ jsonValid: true, importItemCount: normalized.items.length });

            if (normalized.items.length === 0) {
                setError(t("editor.no_items"));
                toast.push({ kind: "error", message: t("editor.toast.no_import") });
                return;
            }

            if (mode === "replace") {
                const r = await replaceAll(normalized.items);
                toast.push({ kind: "success", message: t("editor.toast.replace_done", { removed: r.removed, created: r.created }) });
            } else {
                const r = await mergeIntoExisting(normalized.items);
                toast.push({ kind: "success", message: t("editor.toast.merge_done", { existing: r.existing, added: r.added }) });
            }

            await refreshList();
        } catch (e) {
            const msg = (e as Error | null)?.message ?? t("editor.import_failed");
            setError(msg);
            toast.push({ kind: "error", message: `${t("editor.import_failed")}: ${msg}` });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!active) return;

        (async () => {
            if (!didInitRef.current) {
                didInitRef.current = true;

                const ok = await loadFromExternal();
                if (!ok && text.trim().length === 0) await refreshFromDb({ toast: false });
                return;
            }

            const ok = await loadFromExternal();
            if (!ok) await refreshFromDb({ toast: false });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, mutationNonce]);

    const footerHint = useMemo(() => {
        return mode === "replace" ? t("editor.hint.replace") : t("editor.hint.merge");
    }, [mode, t]);

    const dedupeKeyPreview = useMemo(() => {
        const parsed = safeParseJson(text);
        if (!parsed.ok) return null;
        const normalized = normalizeImportPayload(parsed.data, normalizeAnswer);
        const first = normalized.items[0];
        if (!first) return null;
        return computeSignature(first.body, first.answer);
    }, [text]);

    return (
        <section className={cls("min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/30 shadow", asMain ? "p-5" : "p-5")}>
            <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{t("editor.title")}</div>
                    <div className="mt-1 text-xs text-zinc-500">{t("editor.subtitle")}</div>
                </div>
            </div>

            <div className="mt-4 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-400" htmlFor="editorMode">
                            {t("editor.mode")}
                        </label>
                        <select
                            id="editorMode"
                            value={mode}
                            onChange={(e) => setMode(e.target.value === "merge" ? "merge" : "replace")}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-zinc-500"
                            disabled={loading}
                        >
                            <option value="replace">{t("editor.mode.replace")}</option>
                            <option value="merge">{t("editor.mode.merge")}</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void refreshFromDb({ toast: true })}
                            disabled={loading}
                            className={cls(
                                "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                loading && "opacity-60"
                            )}
                        >
                            {t("editor.refresh_db")}
                        </button>
                        <button
                            type="button"
                            onClick={() => void downloadJson()}
                            disabled={loading}
                            className={cls(
                                "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                loading && "opacity-60"
                            )}
                        >
                            {t("editor.export_json")}
                        </button>
                        <button
                            type="button"
                            onClick={() => void apply()}
                            disabled={loading}
                            className={cls(
                                "rounded-xl px-3 py-2 text-xs font-medium",
                                "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
                                loading && "opacity-60"
                            )}
                        >
                            {t("editor.apply")}
                        </button>
                    </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
                    <div className="h-[min(70vh,560px)] w-full min-w-0">
                        <MonacoJsonEditor
                            value={text}
                            onChange={(next) => {
                                setText(next);
                                emitDiagnostics(next);
                            }}
                            className="h-full w-full"
                            readOnly={loading}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <div className="min-w-0 truncate">
                        {footerHint}
                        {dedupeKeyPreview ? <span className="ml-2">{t("editor.dedupe_example")}: {dedupeKeyPreview}</span> : null}
                    </div>
                    {loading ? <div>{t("common.working")}</div> : null}
                </div>
            </div>
        </section>
    );
}
