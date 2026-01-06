// FILE: src/app/features/components/EditorStatusPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { cls } from "@/app/features/lib/question-utils";
import type { Item } from "@/app/features/lib/question-types";
import type { EditorDiagnostics } from "@/app/features/components/EditorIdePanel";
import { useToast } from "@/app/shared/ui/ToastProvider";
import { fetchAllQuestions } from "@/app/features/lib/question-fetch-all";
import { useI18n } from "@/app/shared/i18n/client";

type Stats = {
    total: number;
    byKind: Record<string, number>;
    totalTags: number;
    uniqueTags: number;
    totalThumbs: number;
    uniqueThumbs: number;
    updatedAt: string;
};

function nowIso() {
    return new Date().toISOString();
}

function computeStats(all: Item[]): Stats {
    const byKind: Record<string, number> = {};
    let totalTags = 0;
    const uniqTags = new Set<string>();
    let totalThumbs = 0;
    const uniqThumbs = new Set<string>();

    for (const it of all) {
        const k = it.answer?.type ?? "unknown";
        byKind[k] = (byKind[k] ?? 0) + 1;

        const tags = Array.isArray(it.tags) ? it.tags : [];
        totalTags += tags.length;
        for (const t of tags) uniqTags.add(t);

        const thumbs = Array.isArray(it.thumbnails) ? it.thumbnails : [];
        totalThumbs += thumbs.length;
        for (const u of thumbs) uniqThumbs.add(u);
    }

    return {
        total: all.length,
        byKind,
        totalTags,
        uniqueTags: uniqTags.size,
        totalThumbs,
        uniqueThumbs: uniqThumbs.size,
        updatedAt: nowIso(),
    };
}

export function EditorStatusPanel(props: {
    appError: string | null;
    jsonDiagnostics: EditorDiagnostics | null;
    setError: (msg: string | null) => void;
    active: boolean;
}) {
    const { appError, jsonDiagnostics, setError, active } = props;
    const toast = useToast();
    const { t } = useI18n();

    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);

    async function refreshStats() {
        setLoading(true);
        try {
            const all = await fetchAllQuestions({ q: "", sort: "id_asc", pageSize: 100 });
            setStats(computeStats(all));
        } catch (e) {
            const msg = (e as Error | null)?.message ?? t("editor.export_failed");
            setError(msg);
            toast.push({ kind: "error", message: t("toast.stats_failed", { msg }) });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!active) return;
        void refreshStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const jsonPanel = useMemo(() => {
        if (!jsonDiagnostics) {
            return { badge: "bg-zinc-100/10 text-zinc-200 border-zinc-800", text: t("status.json.no_diag") };
        }
        if (!jsonDiagnostics.jsonValid) {
            return {
                badge: "bg-rose-500/15 text-rose-200 border-rose-900/60",
                text: jsonDiagnostics.jsonError ?? t("status.json.invalid"),
            };
        }
        return {
            badge: "bg-emerald-500/15 text-emerald-200 border-emerald-900/60",
            text: t("status.json.valid", { n: jsonDiagnostics.importItemCount }),
        };
    }, [jsonDiagnostics, t]);

    return (
        <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow">
            <div className="flex min-w-0 items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-200">{t("status.title")}</h2>
                <button
                    type="button"
                    onClick={() => void refreshStats()}
                    disabled={loading}
                    className={cls(
                        "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                        loading && "opacity-60"
                    )}
                >
                    {t("common.refresh")}
                </button>
            </div>

            <div className="mt-4 min-w-0 space-y-3">
                <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="text-sm font-medium text-zinc-200">{t("status.error")}</div>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                        >
                            {t("common.clear")}
                        </button>
                    </div>

                    <div className="mt-3 space-y-2">
                        <div className="text-xs text-zinc-400">{t("status.error.app")}</div>
                        {appError ? (
                            <div className="min-w-0 rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200">
                                {appError}
                            </div>
                        ) : (
                            <div className="text-xs text-zinc-500">{t("status.error.none")}</div>
                        )}

                        <div className="pt-2 text-xs text-zinc-400">{t("status.error.json")}</div>
                        <div className={cls("min-w-0 rounded-xl border p-3 text-xs", jsonPanel.badge)}>{jsonPanel.text}</div>
                    </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                    <div className="text-sm font-medium text-zinc-200">{t("status.stats.title")}</div>

                    {stats ? (
                        <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                                    <div className="text-zinc-400">{t("status.stats.total_items")}</div>
                                    <div className="mt-1 text-lg font-semibold text-zinc-100">{stats.total}</div>
                                </div>

                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                                    <div className="text-zinc-400">{t("status.stats.kinds")}</div>
                                    <div className="mt-2 space-y-1 text-zinc-200">
                                        {Object.entries(stats.byKind)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([k, v]) => (
                                                <div key={k} className="flex items-center justify-between">
                                                    <span className="text-zinc-300">{k}</span>
                                                    <span className="text-zinc-100">{v}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                                    <div className="text-zinc-400">{t("status.stats.tags")}</div>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-300">{t("status.stats.total")}</span>
                                            <span className="text-zinc-100">{stats.totalTags}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-300">{t("status.stats.unique")}</span>
                                            <span className="text-zinc-100">{stats.uniqueTags}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                                    <div className="text-zinc-400">{t("status.stats.thumbs")}</div>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-300">{t("status.stats.total")}</span>
                                            <span className="text-zinc-100">{stats.totalThumbs}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-300">{t("status.stats.unique")}</span>
                                            <span className="text-zinc-100">{stats.uniqueThumbs}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-[11px] text-zinc-500">
                                {t("status.stats.updated")}: {stats.updatedAt}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 text-xs text-zinc-500">{loading ? t("common.loading") : "No stats."}</div>
                    )}
                </div>
            </div>
        </section>
    );
}
