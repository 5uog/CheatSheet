// FILE: src/components/panels/question-items-panel.tsx
"use client";

import { useMemo, useState } from "react";
import type { Item } from "../lib/question-types";
import { cls, answerKind, formatCorrect, isImageUrl } from "../lib/question-utils";
import { ModalShell } from "../ui/modal-shell";

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

    const [viewer, setViewer] = useState<{ open: boolean; urls: string[]; index: number; title?: string }>({ open: false, urls: [], index: 0 });

    const canPrev = viewer.open && viewer.index > 0;
    const canNext = viewer.open && viewer.index < viewer.urls.length - 1;

    function openViewer(urls: string[], index: number, title?: string) {
        const safe = urls.filter((u) => typeof u === "string" && u.trim().length > 0);
        if (safe.length === 0) return;
        const idx = Math.max(0, Math.min(safe.length - 1, index));
        setViewer({ open: true, urls: safe, index: idx, title });
        document.documentElement.classList.add("overflow-hidden");
        document.body.classList.add("overflow-hidden");
    }

    function closeViewer() {
        setViewer((v) => ({ ...v, open: false }));
        document.documentElement.classList.remove("overflow-hidden");
        document.body.classList.remove("overflow-hidden");
    }

    function stepViewer(delta: number) {
        setViewer((v) => {
            const next = Math.max(0, Math.min(v.urls.length - 1, v.index + delta));
            return { ...v, index: next };
        });
    }

    const currentUrl = viewer.open ? viewer.urls[viewer.index] : null;

    const viewerThumbs = useMemo(() => {
        if (!viewer.open) return [];
        const max = 12;
        const start = Math.max(0, Math.min(viewer.index - Math.floor(max / 2), Math.max(0, viewer.urls.length - max)));
        return viewer.urls.slice(start, start + max).map((u, i) => ({ u, i: start + i }));
    }, [viewer.open, viewer.index, viewer.urls]);

    return (
        <>
            <section className={cls("rounded-2xl border border-zinc-800 bg-zinc-900/30 shadow", dense ? "p-4" : "p-5")}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-zinc-200">Items</h2>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>
                            {total} total / page {pager.p} of {pager.m}
                        </span>
                        <select
                            aria-label="Items per page"
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
                        const previewMax = dense ? 6 : 6;
                        const preview = thumbs.slice(0, previewMax);
                        const rest = Math.max(0, thumbs.length - previewMax);

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
                                                    className={cls(
                                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                                                        boolBadge(boolValue)
                                                    )}
                                                    title={boolValue === 1 ? "True" : "False"}
                                                >
                                                    {boolValue === 1 ? "True" : "False"}
                                                </span>
                                            )}

                                            <span className="text-xs text-zinc-500">ID {it.id}</span>
                                            <span className="text-xs text-zinc-500">Added {it.created_at}</span>
                                            <span className="text-xs text-zinc-500">Updated {it.updated_at}</span>
                                        </div>

                                        {it.tags.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {it.tags.slice(0, 24).map((t) => (
                                                    <span
                                                        key={t}
                                                        className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-200"
                                                        title={t}
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {it.tags.length > 24 && <span className="text-[11px] text-zinc-500">... ({it.tags.length} total)</span>}
                                            </div>
                                        )}

                                        <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm text-zinc-100">{it.body}</p>

                                        {thumbs.length > 0 && (
                                            <div className={cls("mt-3 grid gap-2", dense ? "grid-cols-3" : "grid-cols-6")}>
                                                {preview.map((u, i) => {
                                                    const isLast = i === preview.length - 1 && rest > 0;
                                                    return (
                                                        <button
                                                            key={`${it.id}-${i}`}
                                                            type="button"
                                                            onClick={() => openViewer(thumbs, i, `ID ${it.id}`)}
                                                            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 text-left"
                                                            title={u}
                                                        >
                                                            {isImageUrl(u) ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={u}
                                                                    alt={`Thumbnail ${i + 1}`}
                                                                    className={cls(
                                                                        "h-20 w-full object-cover transition-transform duration-200 group-hover:scale-105",
                                                                        isLast && "blur-[1.5px] brightness-75"
                                                                    )}
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="flex h-20 items-center justify-center text-xs text-zinc-400">Open</div>
                                                            )}

                                                            {isLast && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-zinc-100">+{rest}</div>
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {it.answer.type === "choice" && it.answer.options.length > 0 && (
                                            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                                                <div className="text-xs text-zinc-400">Options</div>
                                                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                                                    {it.answer.options.slice(0, 12).map((op, i) => (
                                                        <li key={i} className="flex gap-2">
                                                            <span className="text-zinc-500">{i + 1}.</span>
                                                            <span className="min-w-0 flex-1 wrap-break-word">{op}</span>
                                                        </li>
                                                    ))}
                                                    {it.answer.options.length > 12 && <li className="text-xs text-zinc-500">... ({it.answer.options.length} total)</li>}
                                                </ul>
                                                <div className="mt-2 text-xs text-zinc-400">{formatCorrect(it)}</div>
                                            </div>
                                        )}

                                        {it.answer.type !== "choice" && <div className="mt-3 text-xs text-zinc-400">{formatCorrect(it)}</div>}
                                    </div>

                                    <div className="shrink-0 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void onOpenEdit(it)}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void onDelete(it.id)}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {items.length === 0 && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-400">No data.</div>
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
                            Prev
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
                            Next
                        </button>
                    </div>
                </div>
            </section>

            <ModalShell open={viewer.open} onClose={closeViewer} maxWidthClass="max-w-5xl">
                {viewer.open && (
                    <>
                        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-zinc-100">Viewer {viewer.title ? `(${viewer.title})` : ""}</div>
                                <div className="text-xs text-zinc-500">
                                    {viewer.index + 1} / {viewer.urls.length}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => stepViewer(-1)}
                                    disabled={!canPrev}
                                    className={cls(
                                        "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                        !canPrev && "opacity-50"
                                    )}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={() => stepViewer(1)}
                                    disabled={!canNext}
                                    className={cls(
                                        "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                        !canNext && "opacity-50"
                                    )}
                                >
                                    Next
                                </button>
                                <button
                                    type="button"
                                    onClick={closeViewer}
                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto overscroll-contain p-4">
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-2">
                                {currentUrl && isImageUrl(currentUrl) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={currentUrl} alt={`Image ${viewer.index + 1}`} className="max-h-[60vh] w-full object-contain" />
                                ) : (
                                    <div className="flex h-[60vh] items-center justify-center text-sm text-zinc-300">Not an image URL</div>
                                )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1 truncate text-xs text-zinc-300">{currentUrl ?? ""}</div>
                                {currentUrl && (
                                    <a
                                        href={currentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                    >
                                        Open in new tab
                                    </a>
                                )}
                            </div>

                            <div className="mt-4">
                                <div className="text-xs text-zinc-500">Thumbnails</div>
                                <div className="mt-2 grid grid-cols-6 gap-2">
                                    {viewerThumbs.map(({ u, i }) => (
                                        <button
                                            key={`${u}-${i}`}
                                            type="button"
                                            onClick={() => setViewer((v) => ({ ...v, index: i }))}
                                            className={cls(
                                                "group relative overflow-hidden rounded-xl border bg-zinc-950/40",
                                                i === viewer.index ? "border-zinc-100/70" : "border-zinc-800 hover:border-zinc-600"
                                            )}
                                            title={u}
                                        >
                                            {isImageUrl(u) ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={u} alt={`Thumb ${i + 1}`} className="h-16 w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                                            ) : (
                                                <div className="flex h-16 items-center justify-center text-[11px] text-zinc-400">Open</div>
                                            )}
                                            <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-100">{i + 1}</div>
                                        </button>
                                    ))}
                                </div>
                                {viewer.urls.length > viewerThumbs.length && (
                                    <div className="mt-2 text-[11px] text-zinc-500">
                                        Showing nearby {viewerThumbs.length} of {viewer.urls.length}.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </ModalShell>
        </>
    );
}
