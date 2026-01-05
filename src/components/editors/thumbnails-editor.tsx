// FILE: src/components/editors/thumbnails-editor.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cls, isProbablyImageUrl, normalizeThumbs } from "../lib/question-utils";
import { apiUploadImages } from "../lib/question-api";

export function ThumbnailsEditor(props: {
    title?: string;
    value: string[];
    onChange: (next: string[]) => void;
    setError?: (msg: string | null) => void;
    enableUpload?: boolean;
    compact?: boolean;
    maxPreview?: number;

    // Optional controlled URL input (useful for Create panel)
    urlInputValue?: string;
    setUrlInputValue?: (v: string) => void;

    // Optional external upload handler (useful for Create panel)
    uploadFiles?: (files: FileList | null) => Promise<void>;
    uploading?: boolean;
}) {
    const {
        title = "Thumbnails",
        value,
        onChange,
        setError,
        enableUpload = true,
        compact = false,
        maxPreview = 6,
        urlInputValue,
        setUrlInputValue,
        uploadFiles: externalUploadFiles,
        uploading: externalUploading,
    } = props;

    const [localUrlInput, setLocalUrlInput] = useState("");
    const [localUploading, setLocalUploading] = useState(false);

    const urlInput = urlInputValue ?? localUrlInput;
    const setUrlInput = setUrlInputValue ?? setLocalUrlInput;

    const uploading = typeof externalUploading === "boolean" ? externalUploading : localUploading;

    const previews = useMemo(() => value.filter((u) => isProbablyImageUrl(u)).slice(0, maxPreview), [value, maxPreview]);

    function addFromInput() {
        const u = urlInput.trim();
        if (!u) return;
        onChange(normalizeThumbs([...value, u]));
        setUrlInput("");
    }

    async function uploadFilesInternal(files: FileList | null) {
        if (!enableUpload) return;
        if (!files || files.length === 0) return;

        // Prefer external handler if provided
        if (externalUploadFiles) {
            await externalUploadFiles(files);
            return;
        }

        setLocalUploading(true);
        setError?.(null);
        try {
            const r = await apiUploadImages(files);
            if (!r.ok) {
                setError?.(r.error);
                return;
            }
            if (r.data.urls.length) onChange(normalizeThumbs([...value, ...r.data.urls]));
        } finally {
            setLocalUploading(false);
        }
    }

    return (
        <div className={cls("rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow", compact ? "p-3" : "p-4")}>
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">{title}</div>
                <div className="text-xs text-zinc-500">{value.length} saved</div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addFromInput();
                        }
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                    placeholder="Add URL (Enter)"
                />
                <button
                    type="button"
                    onClick={addFromInput}
                    className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                >
                    Add
                </button>
            </div>

            {enableUpload && (
                <div className="mt-3">
                    <label className="block text-xs text-zinc-400" htmlFor="thumbFilesShared">
                        Upload local files (images)
                    </label>
                    <input
                        id="thumbFilesShared"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => void uploadFilesInternal(e.target.files)}
                        disabled={uploading}
                        className="mt-2 block w-full text-sm text-zinc-200 file:mr-3 file:rounded-xl file:border file:border-zinc-800 file:bg-zinc-950/40 file:px-3 file:py-2 file:text-xs file:text-zinc-200 hover:file:bg-zinc-950/70"
                    />
                    {uploading && <div className="mt-2 text-xs text-zinc-500">Uploading...</div>}
                </div>
            )}

            {previews.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {previews.map((u) => (
                        <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/30"
                            title="Open"
                        >
                            <div className="relative h-28 w-full">
                                <Image
                                    src={u}
                                    alt="thumbnail"
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover transition-transform group-hover:scale-[1.02]"
                                    unoptimized
                                />
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-black/55 p-2">
                                <div className="truncate text-[11px] text-zinc-200">{u}</div>
                            </div>
                        </a>
                    ))}
                </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {value.map((u) => (
                    <div key={u} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/30 p-2">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs text-zinc-200">{u}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onChange(value.filter((x) => x !== u))}
                            className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-950/70"
                        >
                            Remove
                        </button>
                    </div>
                ))}
                {value.length === 0 && <div className="text-xs text-zinc-500">No thumbnails.</div>}
            </div>

            {value.length > 0 && <div className="mt-2 text-xs text-zinc-500">Tip: thumbnails are shown inline in the list.</div>}
        </div>
    );
}
