// FILE: src/app/shared/ui/ModalShell.tsx
"use client";

import type { ReactNode } from "react";
import { cls } from "@/app/features/lib/question-utils";

export function ModalShell(props: {
    open: boolean;
    onClose: () => void;
    maxWidthClass?: string;
    children: ReactNode;
}) {
    const { open, onClose, maxWidthClass = "max-w-4xl", children } = props;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
            <div
                className={cls(
                    "relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl",
                    maxWidthClass
                )}
            >
                {children}
            </div>
        </div>
    );
}
