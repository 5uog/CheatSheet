// FILE: src/app/features/editors/ExplanationEditor.tsx
"use client";

import { cls } from "@/app/features/lib/question-utils";
import { useI18n } from "@/app/shared/i18n/client";

export function ExplanationEditor(props: {
    title?: string;
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    compact?: boolean;
    minRows?: number;
}) {
    const { title, value, onChange, placeholder, compact = false, minRows = 6 } = props;
    const { t } = useI18n();

    const resolvedTitle = title ?? t("explanation.title");
    const resolvedPlaceholder = placeholder ?? t("explanation.placeholder");

    return (
        <div className={cls("rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow", compact ? "p-3" : "p-4")}>
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">{resolvedTitle}</div>
                <div className="text-xs text-zinc-500">{(value ?? "").length} chars</div>
            </div>

            <div className="mt-3 space-y-2">
                <textarea
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                    placeholder={resolvedPlaceholder}
                    rows={minRows}
                />
                <div className="text-xs text-zinc-500">{t("explanation.tip")}</div>
            </div>
        </div>
    );
}
