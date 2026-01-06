// FILE: src/app/shared/ui/SegmentedTabs.tsx
"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { cls } from "@/app/features/lib/question-utils";

export type SegTab<T extends string> = { key: T; label: string };

const GRID_COLS_CLASS: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
};

const W_CLASS: Record<number, string> = {
    1: "w-full",
    2: "w-1/2",
    3: "w-1/3",
    4: "w-1/4",
};

const X_CLASS: Record<number, string> = {
    0: "translate-x-0",
    1: "translate-x-full",
    2: "translate-x-[200%]",
    3: "translate-x-[300%]",
};

export function SegmentedTabs<T extends string>(props: {
    value: T;
    onChange: (v: T) => void;
    tabs: readonly SegTab<T>[];
    ariaLabel?: string;
    className?: string;
}) {
    const { value, onChange, tabs, ariaLabel = "Tabs", className } = props;

    const baseId = useId();
    const refs = useRef<Array<HTMLButtonElement | null>>([]);

    const idx = useMemo(() => {
        const i = tabs.findIndex((t) => t.key === value);
        return i >= 0 ? i : 0;
    }, [tabs, value]);

    const count = tabs.length;

    useEffect(() => {
        refs.current = refs.current.slice(0, tabs.length);
    }, [tabs.length]);

    function focusAt(i: number) {
        const el = refs.current[i];
        if (el) el.focus();
    }

    function onKeyDown(e: React.KeyboardEvent, currentIndex: number) {
        if (count <= 1) return;

        const key = e.key;
        const nextIndex = (() => {
            if (key === "ArrowRight") return (currentIndex + 1) % count;
            if (key === "ArrowLeft") return (currentIndex - 1 + count) % count;
            if (key === "Home") return 0;
            if (key === "End") return count - 1;
            return null;
        })();

        if (nextIndex == null) return;

        e.preventDefault();
        const nextKey = tabs[nextIndex]?.key;
        if (nextKey != null) onChange(nextKey);
        focusAt(nextIndex);
    }

    const supported = count >= 1 && count <= 4;

    const gridCols = supported ? GRID_COLS_CLASS[count] : "grid-cols-1";
    const wClass = supported ? W_CLASS[count] : "w-full";
    const xClass = supported ? X_CLASS[Math.max(0, Math.min(3, idx))] : "translate-x-0";

    return (
        <div
            className={cls(
                "relative grid rounded-2xl border border-zinc-800 bg-zinc-950/40 p-1 shadow",
                gridCols,
                className
            )}
            role="tablist"
            aria-label={ariaLabel}
        >
            <div className="pointer-events-none absolute inset-1" aria-hidden="true">
                {supported ? (
                    <div className={cls("h-full rounded-xl bg-zinc-100 transition-transform duration-300 ease-out", wClass, xClass)} />
                ) : (
                    <div className="h-full rounded-xl bg-zinc-100/0" />
                )}
            </div>

            {tabs.map((t, i) => {
                const selected = t.key === value;
                const tabId = `${baseId}-tab-${t.key}`;
                const panelId = `${baseId}-panel-${t.key}`;

                if (selected) {
                    return (
                        <button
                            key={t.key}
                            ref={(el) => {
                                refs.current[i] = el;
                            }}
                            id={tabId}
                            type="button"
                            role="tab"
                            aria-selected="true"
                            aria-controls={panelId}
                            tabIndex={0}
                            onKeyDown={(e) => onKeyDown(e, i)}
                            onClick={() => onChange(t.key)}
                            className={cls("relative z-10 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors", "text-zinc-950")}
                        >
                            {t.label}
                        </button>
                    );
                }

                return (
                    <button
                        key={t.key}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        id={tabId}
                        type="button"
                        role="tab"
                        aria-selected="false"
                        aria-controls={panelId}
                        tabIndex={-1}
                        onKeyDown={(e) => onKeyDown(e, i)}
                        onClick={() => onChange(t.key)}
                        className={cls("relative z-10 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors", "text-zinc-200 hover:text-zinc-50")}
                    >
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}
