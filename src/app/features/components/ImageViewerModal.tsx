// FILE: src/app/features/components/ImageViewerModal.tsx
"use client";

import type { I18nCtx } from "@/app/shared/i18n/client";
import { ModalShell } from "@/app/shared/ui/ModalShell";
import { cls, isImageUrl } from "@/app/features/lib/question-utils";

export function ImageViewerModal(props: {
    open: boolean;
    title?: string;
    urls: string[];
    index: number;

    canPrev: boolean;
    canNext: boolean;

    currentUrl: string | null;
    viewerThumbs: Array<{ u: string; i: number }>;

    onClose: () => void;
    onStep: (delta: number) => void;
    onSelectIndex: (index: number) => void;

    t: I18nCtx["t"];
}) {
    const { open, title, urls, index, canPrev, canNext, currentUrl, viewerThumbs, onClose, onStep, onSelectIndex, t } = props;

    return (
        <ModalShell open={open} onClose={onClose} maxWidthClass="max-w-5xl">
            {open && (
                <>
                    <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-100">
                                {t("items.viewer.title")} {title ? `(${title})` : ""}
                            </div>
                            <div className="text-xs text-zinc-500">
                                {index + 1} / {urls.length}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onStep(-1)}
                                disabled={!canPrev}
                                className={cls(
                                    "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                    !canPrev && "opacity-50"
                                )}
                            >
                                {t("common.prev")}
                            </button>
                            <button
                                type="button"
                                onClick={() => onStep(1)}
                                disabled={!canNext}
                                className={cls(
                                    "rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                                    !canNext && "opacity-50"
                                )}
                            >
                                {t("common.next")}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                            >
                                {t("common.close")}
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[80vh] overflow-y-auto overscroll-contain p-4">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-2">
                            {currentUrl && isImageUrl(currentUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={currentUrl}
                                    alt={`${t("items.viewer.title")} ${index + 1}`}
                                    className="max-h-[60vh] w-full object-contain"
                                />
                            ) : (
                                <div className="flex h-[60vh] items-center justify-center text-sm text-zinc-300">
                                    {t("items.viewer.not_image")}
                                </div>
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
                                    {t("common.open_new_tab")}
                                </a>
                            )}
                        </div>

                        <div className="mt-4">
                            <div className="text-xs text-zinc-500">{t("items.viewer.thumbnails")}</div>
                            <div className="mt-2 grid grid-cols-6 gap-2">
                                {viewerThumbs.map(({ u, i }) => (
                                    <button
                                        key={`${u}-${i}`}
                                        type="button"
                                        onClick={() => onSelectIndex(i)}
                                        className={cls(
                                            "group relative overflow-hidden rounded-xl border bg-zinc-950/40",
                                            i === index ? "border-zinc-100/70" : "border-zinc-800 hover:border-zinc-600"
                                        )}
                                        title={u}
                                    >
                                        {isImageUrl(u) ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={u}
                                                alt={`${t("items.viewer.thumbnails")} ${i + 1}`}
                                                className="h-16 w-full object-cover transition-transform group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-16 items-center justify-center text-[11px] text-zinc-400">
                                                {t("common.open")}
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-100">
                                            {i + 1}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {urls.length > viewerThumbs.length && (
                                <div className="mt-2 text-[11px] text-zinc-500">
                                    {t("items.viewer.showing_nearby", { shown: viewerThumbs.length, total: urls.length })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </ModalShell>
    );
}
