// FILE: src/app/features/editors/TagsEditor.tsx
"use client";

import { useMemo, useState } from "react";
import { cls, normalizeTags } from "@/app/features/lib/question-utils";
import { useI18n } from "@/app/shared/i18n/client";

export function TagsEditor(props: {
    title?: string;
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    compact?: boolean;

    inputValue?: string;
    setInputValue?: (v: string) => void;
}) {
    const { title, value, onChange, placeholder, compact = false, inputValue, setInputValue } = props;
    const { t } = useI18n();

    const resolvedTitle = title ?? t("tags.title");
    const resolvedPlaceholder = placeholder ?? t("tags.placeholder");

    const [localInput, setLocalInput] = useState("");

    const input = inputValue ?? localInput;
    const setInput = setInputValue ?? setLocalInput;

    const canAdd = useMemo(() => input.trim().length > 0, [input]);

    function addFromInput() {
        const tt = input.trim();
        if (!tt) return;
        onChange(normalizeTags([...value, tt]));
        setInput("");
    }

    return (
        <div className={cls("rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow", compact ? "p-3" : "p-4")}>
            <div className="text-sm font-medium text-zinc-200">{resolvedTitle}</div>

            <div className="mt-3 flex items-center gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addFromInput();
                        }
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                    placeholder={resolvedPlaceholder}
                />
                <button
                    type="button"
                    onClick={addFromInput}
                    disabled={!canAdd}
                    className={cls(
                        "shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70",
                        !canAdd && "opacity-50"
                    )}
                >
                    {t("tags.add")}
                </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {value.map((tt) => (
                    <button
                        key={tt}
                        type="button"
                        onClick={() => onChange(value.filter((x) => x !== tt))}
                        className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-950/70"
                        title={t("common.remove")}
                    >
                        {tt}
                    </button>
                ))}
                {value.length === 0 && <div className="text-xs text-zinc-500">{t("tags.none")}</div>}
            </div>

            {value.length > 0 && <div className="mt-2 text-xs text-zinc-500">{t("tags.tip_remove")}</div>}
        </div>
    );
}
