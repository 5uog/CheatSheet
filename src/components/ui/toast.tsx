// FILE: src/components/ui/toast.tsx
"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";

export type ToastInput = {
    kind: ToastKind;
    message: string;
    ttlMs?: number;
};

type ToastItem = {
    id: string;
    kind: ToastKind;
    message: string;
};

type ToastApi = {
    push: (t: ToastInput) => void;
};

const Ctx = createContext<ToastApi | null>(null);

function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const timers = useRef(new Map<string, number>());

    const api = useMemo<ToastApi>(() => {
        return {
            push(t) {
                const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
                const item: ToastItem = { id, kind: t.kind, message: t.message };

                setItems((xs) => [item, ...xs].slice(0, 6));

                const ttl = typeof t.ttlMs === "number" ? Math.max(800, t.ttlMs) : 3000;
                const timer = window.setTimeout(() => {
                    setItems((xs) => xs.filter((x) => x.id !== id));
                    timers.current.delete(id);
                }, ttl);

                timers.current.set(id, timer);
            },
        };
    }, []);

    return (
        <Ctx.Provider value={api}>
            {children}
            <div className="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
                {items.map((t) => (
                    <div
                        key={t.id}
                        className={cls(
                            "rounded-2xl border p-3 text-sm shadow backdrop-blur",
                            "bg-zinc-950/80 text-zinc-50",
                            t.kind === "success" && "border-emerald-900/60",
                            t.kind === "error" && "border-rose-900/60",
                            t.kind === "info" && "border-zinc-800"
                        )}
                        role="status"
                        aria-live="polite"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={cls(
                                    "h-2.5 w-2.5 flex-none rounded-full",
                                    t.kind === "success" && "bg-emerald-400",
                                    t.kind === "error" && "bg-rose-400",
                                    t.kind === "info" && "bg-zinc-300"
                                )}
                            />
                            <div className="min-w-0 flex-1 wrap-break-word">{t.message}</div>
                            <button
                                type="button"
                                className="flex-none rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-50"
                                onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Ctx.Provider>
    );
}

export function useToast(): ToastApi {
    const v = useContext(Ctx);
    if (!v) {
        return {
            push: () => {},
        };
    }
    return v;
}
