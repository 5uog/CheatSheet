// FILE: src/components/editors/tags-editor.tsx
"use client";

import { useMemo, useState } from "react";
import { cls, normalizeTags } from "../lib/question-utils";

export function TagsEditor(props: {
    title?: string;
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    compact?: boolean;

    // Optional controlled input (useful for Create panel)
    inputValue?: string;
    setInputValue?: (v: string) => void;
}) {
    const {
        title = "Tags",
        value,
        onChange,
        placeholder = "Add tag (Enter)",
        compact = false,
        inputValue,
        setInputValue,
    } = props;

    const [localInput, setLocalInput] = useState("");

    const input = inputValue ?? localInput;
    const setInput = setInputValue ?? setLocalInput;

    const canAdd = useMemo(() => input.trim().length > 0, [input]);

    function addFromInput() {
        const t = input.trim();
        if (!t) return;
        onChange(normalizeTags([...value, t]));
        setInput("");
    }

    return (
        <div className={cls("rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow", compact ? "p-3" : "p-4")}>
            <div className="text-sm font-medium text-zinc-200">{title}</div>

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
                    placeholder={placeholder}
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
                    Add
                </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {value.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(value.filter((x) => x !== t))}
                        className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-950/70"
                        title="Remove"
                    >
                        {t}
                    </button>
                ))}
                {value.length === 0 && <div className="text-xs text-zinc-500">No tags.</div>}
            </div>

            {value.length > 0 && (
                <div className="mt-2 text-xs text-zinc-500">Tip: click a tag to remove. (Max 200 unique tags)</div>
            )}
        </div>
    );
}
