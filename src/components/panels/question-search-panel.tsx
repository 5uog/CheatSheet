// FILE: src/components/panels/question-search-panel.tsx
"use client";

import type { Kind, Mode, SortKey } from "../lib/question-types";
import { SortKeys, isKind, isSortKey } from "../lib/question-types";
import { cls, buildHelpText } from "../lib/question-utils";

export function QuestionSearchPanel(props: {
    mode: Mode;

    q: string;
    setQ: (v: string) => void;

    loading: boolean;

    filterTag: string;
    setFilterTag: (v: string) => void;

    kindFilter: "" | Kind;
    setKindFilter: (v: "" | Kind) => void;

    boolOnly: "" | "true" | "false";
    setBoolOnly: (v: "" | "true" | "false") => void;

    sort: SortKey;
    setSort: (v: SortKey) => void;

    setPage: (n: number) => void;

    onSearch: (e: React.FormEvent) => Promise<void> | void;
    onReset: () => Promise<void> | void;
}) {
    const { mode, q, setQ, loading, filterTag, setFilterTag, kindFilter, setKindFilter, boolOnly, setBoolOnly, sort, setSort, setPage, onSearch, onReset } = props;

    const help = buildHelpText();

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-200">Search</h2>
                <span className="text-xs text-zinc-400">Mode: {mode === "all" ? "All" : mode === "exact" ? "Exact" : mode === "like" ? "LIKE" : "FTS"}</span>
            </div>

            <form onSubmit={onSearch} className="mt-4 space-y-3">
                <label className="block text-xs text-zinc-400" htmlFor="query">
                    Query
                </label>
                <input
                    id="query"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                    placeholder='Example: (右折 OR left-turn) -二段階 / "安全確認" / intersec* / ~右折 / ~@ -#'
                />

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="filterTag">
                            Filter: Tag
                        </label>
                        <input
                            id="filterTag"
                            value={filterTag}
                            onChange={(e) => {
                                setFilterTag(e.target.value);
                                setPage(1);
                            }}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                            placeholder='e.g. "traffic"'
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="kindFilter">
                            Filter: Kind
                        </label>
                        <select
                            id="kindFilter"
                            value={kindFilter}
                            onChange={(e) => {
                                const v = e.target.value.trim();
                                setKindFilter(v === "" ? "" : isKind(v) ? v : "");
                                setPage(1);
                            }}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                        >
                            <option value="">All</option>
                            <option value="boolean">Boolean (True/False)</option>
                            <option value="choice">Choice</option>
                            <option value="text">Text</option>
                            <option value="blank">Blank</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="boolOnly">
                            Filter: Boolean only
                        </label>
                        <select
                            id="boolOnly"
                            value={boolOnly}
                            onChange={(e) => {
                                const v = e.target.value.trim();
                                setBoolOnly(v === "true" || v === "false" ? v : "");
                                setPage(1);
                            }}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                        >
                            <option value="">(off)</option>
                            <option value="true">True only</option>
                            <option value="false">False only</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="sortKey">
                            Sort
                        </label>
                        <select
                            id="sortKey"
                            value={sort}
                            onChange={(e) => {
                                const v = e.target.value.trim();
                                setSort(isSortKey(v) ? v : "id_desc");
                                setPage(1);
                            }}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                        >
                            {SortKeys.map((k) => {
                                const label =
                                    k === "id_desc"
                                        ? "ID ↓"
                                        : k === "id_asc"
                                            ? "ID ↑"
                                            : k === "created_desc"
                                                ? "Added ↓"
                                                : k === "created_asc"
                                                    ? "Added ↑"
                                                    : k === "updated_desc"
                                                        ? "Updated ↓"
                                                        : "Updated ↑";
                                return (
                                    <option key={k} value={k}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                <label className="block text-xs text-zinc-400" htmlFor="dsl">
                    DSL examples
                </label>
                <pre id="dsl" className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-300">
                    {help}
                </pre>

                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className={cls("rounded-xl px-3 py-2 text-sm font-medium", "bg-zinc-100 text-zinc-950 hover:bg-white", loading && "opacity-60")}
                    >
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={() => void onReset()}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/70"
                    >
                        Reset
                    </button>
                    {loading && <span className="text-xs text-zinc-400">Loading</span>}
                </div>
            </form>
        </section>
    );
}
