// FILE: src/app/shared/ui/ThumbnailGrid.tsx
"use client";

import { cls, isImageUrl } from "@/app/features/lib/question-utils";

export function ThumbnailGrid(props: {
    urls: string[];
    dense?: boolean;
    previewMax?: number;
    onOpen: (index: number) => void;
    title?: string;
    ariaLabel?: string;
}) {
    const { urls, dense = false, previewMax = 6, onOpen, title, ariaLabel } = props;

    const thumbs = urls ?? [];
    if (thumbs.length === 0) return null;

    const preview = thumbs.slice(0, previewMax);
    const rest = Math.max(0, thumbs.length - previewMax);

    return (
        <div className={cls("mt-3 grid gap-2", dense ? "grid-cols-3" : "grid-cols-6")}>
            {preview.map((u, i) => {
                const isLast = i === preview.length - 1 && rest > 0;
                return (
                    <button
                        key={`${i}-${u}`}
                        type="button"
                        onClick={() => onOpen(i)}
                        className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 text-left"
                        title={title ?? u}
                        aria-label={ariaLabel ?? "Open"}
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
    );
}
