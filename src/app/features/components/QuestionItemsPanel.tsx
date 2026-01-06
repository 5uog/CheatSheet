// FILE: src/app/features/components/QuestionItemsPanel.tsx
"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/app/features/lib/question-types";
import { cls, answerKind, formatCorrect } from "@/app/features/lib/question-utils";
import { useI18n } from "@/app/shared/i18n/client";
import { ThumbnailGrid } from "@/app/shared/ui/ThumbnailGrid";
import { ImageViewerModal } from "@/app/features/components/ImageViewerModal";
import { useImageViewer } from "@/app/features/hooks/useImageViewer";

function boolBadge(v: 0 | 1) {
    return v === 1 ? "bg-emerald-500/20 text-emerald-200 border-emerald-800/60" : "bg-red-500/20 text-red-200 border-red-800/60";
}

function getBoolValue(it: Item): 0 | 1 | null {
    const a = it.answer;
    return a.type === "boolean" ? a.value : null;
}

export function QuestionItemsPanel(props: {
    items: Item[];
    total: number;

    page: number;
    setPage: (n: number) => void;

    pageSize: 10 | 30 | 50 | 100;
    setPageSize: (n: 10 | 30 | 50 | 100) => void;

    clampPage: (n: number) => number;
    maxPages: () => number;

    q: string;
    fetchItems: (q: string, pageNo: number) => Promise<void>;

    onDelete: (id: number) => Promise<void>;
    onOpenEdit: (it: Item) => void;

    dense?: boolean;
}) {
    const { items, total, page, setPage, pageSize, setPageSize, clampPage, maxPages, q, fetchItems, onDelete, onOpenEdit, dense = false } = props;
    const { t } = useI18n();

    const pager = (() => {
        const m = maxPages();
        const p = clampPage(page);

        const windowSize = 10;
        const start = Math.max(1, Math.min(p - Math.floor(windowSize / 2), Math.max(1, m - windowSize + 1)));
        const end = Math.min(m, start + windowSize - 1);

        const nums: number[] = [];
        for (let i = start; i <= end; i++) nums.push(i);

        return { m, p, nums, start, end };
    })();

    const { viewer, openViewer, closeViewer, stepViewer, setIndex, canPrev, canNext, currentUrl, viewerThumbs } = useImageViewer({
        maxThumbs: 12,
        lockScroll: true,
    });

    const [expOpen, setExpOpen] = useState<Record<number, boolean>>({});

    function toggleExp(id: number) {
        setExpOpen((m) => ({ ...m, [id]: !m[id] }));
    }

    const previewMax = useMemo(() => (dense ? 6 : 6), [dense]);

    return (
        <>
            <section className={cls("rounded-2xl border border-zinc-800 bg-zinc-900/30 shadow", dense ? "p-4" : "p-5")}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-zinc-200">{t("items.title")}</h2>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>{t("items.pager", { total, page: pager.p, pages: pager.m })}</span>
                        <select
                            aria-label={t("items.per_page")}
                            value={pageSize}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setPageSize((v === 10 || v === 30 || v === 50 || v === 100 ? v : 30) as 10 | 30 | 50 | 100);
                                setPage(1);
                            }}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-zinc-500"
                        >
                            <option value={10}>10</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 grid gap-3">
                    {items.map((it) => {
                        const boolValue = getBoolValue(it);
                        const thumbs = it.thumbnails ?? [];

                        const exp = (it.explanation ?? "").trim();
                        const hasExp = exp.length > 0;
                        const isOpen = !!expOpen[it.id];

                        return (
                            <div key={it.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center rounded-full bg-zinc-100/10 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                                                {answerKind(it)}
                                            </span>

                                            {boolValue != null && (
                                                <span
                                                    className={cls("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", boolBadge(boolValue))}
                                                    title={boolValue === 1 ? t("edit.answer.true") : t("edit.answer.false")}
                                                >
                                                    {boolValue === 1 ? t("edit.answer.true") : t("edit.answer.false")}
                                                </span>
                                            )}

                                            <span className="text-xs text-zinc-500">
                                                {t("edit.id")} {it.id}
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                {t("items.added")} {it.created_at}
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                {t("items.updated")} {it.updated_at}
                                            </span>
                                        </div>

                                        {it.tags.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {it.tags.slice(0, 24).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-200"
                                                        title={tag}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {it.tags.length > 24 && <span className="text-[11px] text-zinc-500">... ({it.tags.length} total)</span>}
                                            </div>
                                        )}

                                        <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm text-zinc-100">{it.body}</p>

                                        {hasExp && (
                                            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs text-zinc-400">{t("items.explanation")}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExp(it.id)}
                                                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-950/70"
                                                    >
                                                        {isOpen ? t("items.explanation.hide") : t("items.explanation.show")}
                                                    </button>
                                                </div>
                                                {isOpen ? (
                                                    <div className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-zinc-200">{exp}</div>
                                                ) : (
                                                    <div className="mt-2 line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm text-zinc-200">{exp}</div>
                                                )}
                                            </div>
                                        )}

                                        <ThumbnailGrid
                                            urls={thumbs}
                                            dense={dense}
                                            previewMax={previewMax}
                                            onOpen={(i) => openViewer(thumbs, i, `${t("edit.id")} ${it.id}`)}
                                            title={`${t("edit.id")} ${it.id}`}
                                            ariaLabel={t("common.open")}
                                        />

                                        {it.answer.type === "choice" && it.answer.options.length > 0 && (
                                            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                                                <div className="text-xs text-zinc-400">{t("items.options")}</div>
                                                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                                                    {it.answer.options.slice(0, 12).map((op, i) => (
                                                        <li key={i} className="flex gap-2">
                                                            <span className="text-zinc-500">{i + 1}.</span>
                                                            <span className="min-w-0 flex-1 wrap-break-word">{op}</span>
                                                        </li>
                                                    ))}
                                                    {it.answer.options.length > 12 && (
                                                        <li className="text-xs text-zinc-500">... ({it.answer.options.length} total)</li>
                                                    )}
                                                </ul>
                                                <div className="mt-2 text-xs text-zinc-400">{formatCorrect(it, t)}</div>
                                            </div>
                                        )}

                                        {it.answer.type !== "choice" && <div className="mt-3 text-xs text-zinc-400">{formatCorrect(it, t)}</div>}
                                    </div>

                                    <div className="shrink-0 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void onOpenEdit(it)}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                        >
                                            {t("common.edit")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void onDelete(it.id)}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                        >
                                            {t("common.delete")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {items.length === 0 && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-400">
                            {t("common.no_data")}
                        </div>
                    )}
                </div>

                <div className="mt-5 flex items-center justify-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const next = clampPage(page - 1);
                                setPage(next);
                                void fetchItems(q, next);
                            }}
                            disabled={pager.p <= 1}
                            className={cls(
                                "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                pager.p <= 1 && "opacity-50"
                            )}
                        >
                            {t("common.prev")}
                        </button>

                        {pager.start > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPage(1);
                                        void fetchItems(q, 1);
                                    }}
                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                >
                                    1
                                </button>
                                <span className="text-xs text-zinc-500">…</span>
                            </>
                        )}

                        {pager.nums.map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => {
                                    setPage(n);
                                    void fetchItems(q, n);
                                }}
                                className={cls(
                                    "rounded-xl px-3 py-2 text-xs",
                                    n === pager.p ? "bg-zinc-100 text-zinc-950" : "border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-950/70"
                                )}
                            >
                                {n}
                            </button>
                        ))}

                        {pager.end < pager.m && (
                            <>
                                <span className="text-xs text-zinc-500">…</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPage(pager.m);
                                        void fetchItems(q, pager.m);
                                    }}
                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                >
                                    {pager.m}
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                const next = clampPage(page + 1);
                                setPage(next);
                                void fetchItems(q, next);
                            }}
                            disabled={pager.p >= pager.m}
                            className={cls(
                                "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                pager.p >= pager.m && "opacity-50"
                            )}
                        >
                            {t("common.next")}
                        </button>
                    </div>
                </div>
            </section>

            <ImageViewerModal
                open={viewer.open}
                title={viewer.title}
                urls={viewer.urls}
                index={viewer.index}
                canPrev={canPrev}
                canNext={canNext}
                currentUrl={currentUrl}
                viewerThumbs={viewerThumbs}
                onClose={closeViewer}
                onStep={stepViewer}
                onSelectIndex={setIndex}
                t={t}
            />
        </>
    );
}
