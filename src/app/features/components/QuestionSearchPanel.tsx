// FILE: src/app/features/components/QuestionSearchPanel.tsx
"use client";

import type { Kind, Mode, SortKey } from "@/app/features/lib/question-types";
import { SortKeys, isKind, isSortKey } from "@/app/features/lib/question-types";
import { cls, buildHelpText } from "@/app/features/lib/question-utils";
import { useI18n } from "@/app/shared/i18n/client";

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
    const { lang, t } = useI18n();

    const help = buildHelpText(lang);

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-200">{t("search.title")}</h2>
                <span className="text-xs text-zinc-400">
                    {t("search.mode")}: {mode === "all" ? "All" : mode === "exact" ? "Exact" : mode === "like" ? "LIKE" : "FTS"}
                </span>
            </div>

            <form onSubmit={onSearch} className="mt-4 space-y-3">
                <label className="block text-xs text-zinc-400" htmlFor="query">
                    {t("search.query")}
                </label>
                <input
                    id="query"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                    placeholder={t("search.query.placeholder")}
                />

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="filterTag">
                            {t("search.filter.tag")}
                        </label>
                        <input
                            id="filterTag"
                            value={filterTag}
                            onChange={(e) => {
                                setFilterTag(e.target.value);
                                setPage(1);
                            }}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500"
                            placeholder={t("search.filter.tag.placeholder")}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="kindFilter">
                            {t("search.filter.kind")}
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
                            <option value="">{lang === "ja" ? "All" : "All"}</option>
                            <option value="boolean">{t("edit.answer.boolean")}</option>
                            <option value="choice">{t("edit.answer.choice")}</option>
                            <option value="text">{t("edit.answer.text")}</option>
                            <option value="blank">{t("edit.answer.blank")}</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="boolOnly">
                            {t("search.filter.bool_only")}
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
                            <option value="">{t("search.filter.bool_off")}</option>
                            <option value="true">{t("search.filter.bool_true")}</option>
                            <option value="false">{t("search.filter.bool_false")}</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-zinc-400" htmlFor="sortKey">
                            {t("search.sort")}
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
                                                ? `${t("items.added")} ↓`
                                                : k === "created_asc"
                                                    ? `${t("items.added")} ↑`
                                                    : k === "updated_desc"
                                                        ? `${t("items.updated")} ↓`
                                                        : `${t("items.updated")} ↑`;
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
                    {t("search.dsl_examples")}
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
                        {t("search.search")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void onReset()}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/70"
                    >
                        {t("search.reset")}
                    </button>
                    {loading && <span className="text-xs text-zinc-400">{t("common.loading")}</span>}
                </div>
            </form>
        </section>
    );
}
