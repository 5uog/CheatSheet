// FILE: src/app/features/hooks/useImageViewer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type ImageViewerState = {
    open: boolean;
    urls: string[];
    index: number;
    title?: string;
};

export type UseImageViewerOptions = {
    maxThumbs?: number;
    lockScroll?: boolean;
};

export function useImageViewer(options?: UseImageViewerOptions) {
    const maxThumbs = options?.maxThumbs ?? 12;
    const lockScroll = options?.lockScroll ?? true;

    const [viewer, setViewer] = useState<ImageViewerState>({
        open: false,
        urls: [],
        index: 0,
    });

    const canPrev = viewer.open && viewer.index > 0;
    const canNext = viewer.open && viewer.index < viewer.urls.length - 1;

    function openViewer(urls: string[], index: number, title?: string) {
        const safe = (urls ?? []).filter((u) => typeof u === "string" && u.trim().length > 0);
        if (safe.length === 0) return;
        const idx = Math.max(0, Math.min(safe.length - 1, index));
        setViewer({ open: true, urls: safe, index: idx, title });
    }

    function closeViewer() {
        setViewer((v) => ({ ...v, open: false }));
    }

    function stepViewer(delta: number) {
        setViewer((v) => {
            const next = Math.max(0, Math.min(v.urls.length - 1, v.index + delta));
            return { ...v, index: next };
        });
    }

    function setIndex(i: number) {
        setViewer((v) => {
            const next = Math.max(0, Math.min(v.urls.length - 1, i));
            return { ...v, index: next };
        });
    }

    const currentUrl = viewer.open ? viewer.urls[viewer.index] : null;

    const viewerThumbs = useMemo(() => {
        if (!viewer.open) return [];
        const start = Math.max(0, Math.min(viewer.index - Math.floor(maxThumbs / 2), Math.max(0, viewer.urls.length - maxThumbs)));
        return viewer.urls.slice(start, start + maxThumbs).map((u, i) => ({ u, i: start + i }));
    }, [viewer.open, viewer.index, viewer.urls, maxThumbs]);

    useEffect(() => {
        if (!lockScroll) return;

        if (viewer.open) {
            document.documentElement.classList.add("overflow-hidden");
            document.body.classList.add("overflow-hidden");
            return () => {
                document.documentElement.classList.remove("overflow-hidden");
                document.body.classList.remove("overflow-hidden");
            };
        }

        document.documentElement.classList.remove("overflow-hidden");
        document.body.classList.remove("overflow-hidden");
        return;
    }, [viewer.open, lockScroll]);

    return {
        viewer,
        setViewer,

        openViewer,
        closeViewer,
        stepViewer,
        setIndex,

        canPrev,
        canNext,

        currentUrl,
        viewerThumbs,
    };
}
