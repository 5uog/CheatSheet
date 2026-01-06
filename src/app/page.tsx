// FILE: src/app/page.tsx
"use client";

import { useState } from "react";
import { EditQuestionDialog } from "@/app/features/components/EditQuestionDialog";
import { SegmentedTabs } from "@/app/shared/ui/SegmentedTabs";
import { QuestionCreatePanel } from "@/app/features/components/QuestionCreatePanel";
import { QuestionItemsPanel } from "@/app/features/components/QuestionItemsPanel";
import { QuestionSearchPanel } from "@/app/features/components/QuestionSearchPanel";
import { EditorIdePanel, type EditorDiagnostics } from "@/app/features/components/EditorIdePanel";
import { EditorStatusPanel } from "@/app/features/components/EditorStatusPanel";
import { useQuestionDb } from "@/app/features/hooks/useQuestionDb";
import type { Item } from "@/app/features/lib/question-types";
import { useI18n } from "@/app/shared/i18n/client";
import { LanguageToggleButton } from "@/app/shared/ui/LanguageToggleButton";

type PanelTab = "search" | "create" | "editor";

export default function Page() {
    const db = useQuestionDb();
    const { t } = useI18n();

    const [editOpen, setEditOpen] = useState(false);
    const [editItem, setEditItem] = useState<Item | null>(null);

    function openEdit(it: Item) {
        setEditItem(it);
        setEditOpen(true);
    }

    const [tab, setTab] = useState<PanelTab>("search");
    const [editorDiag, setEditorDiag] = useState<EditorDiagnostics | null>(null);

    const panels = (
        <div className="space-y-4">
            <SegmentedTabs
                value={tab}
                onChange={(tKey) => setTab(tKey)}
                tabs={[
                    { key: "search", label: t("search.title") },
                    { key: "create", label: t("create.title") },
                    { key: "editor", label: t("editor.title") },
                ]}
                ariaLabel="Panels"
            />

            {tab === "search" && (
                <div className="space-y-4">
                    <div className="text-xs text-zinc-500">{db.tokenizer ? <span>Tokenizer: {db.tokenizer}</span> : null}</div>

                    <QuestionSearchPanel
                        mode={db.mode}
                        q={db.q}
                        setQ={db.setQ}
                        loading={db.loading}
                        filterTag={db.filterTag}
                        setFilterTag={db.setFilterTag}
                        kindFilter={db.kindFilter}
                        setKindFilter={db.setKindFilter}
                        boolOnly={db.boolOnly}
                        setBoolOnly={db.setBoolOnly}
                        sort={db.sort}
                        setSort={db.setSort}
                        setPage={db.setPage}
                        onSearch={db.onSearch}
                        onReset={db.onReset}
                    />
                </div>
            )}

            {tab === "create" && (
                <QuestionCreatePanel
                    newBody={db.newBody}
                    setNewBody={db.setNewBody}
                    newExplanation={db.newExplanation}
                    setNewExplanation={db.setNewExplanation}
                    newKind={db.newKind}
                    setNewKind={db.setNewKind}
                    newOptions={db.newOptions}
                    setNewOptions={db.setNewOptions}
                    newCorrectIndices={db.newCorrectIndices}
                    setNewCorrectIndices={db.setNewCorrectIndices}
                    newCorrectText={db.newCorrectText}
                    setNewCorrectText={db.setNewCorrectText}
                    createTagInput={db.createTagInput}
                    setCreateTagInput={db.setCreateTagInput}
                    createTags={db.createTags}
                    setCreateTags={db.setCreateTags}
                    addCreateTagFromInput={db.addCreateTagFromInput}
                    createThumbUrl={db.createThumbUrl}
                    setCreateThumbUrl={db.setCreateThumbUrl}
                    createThumbs={db.createThumbs}
                    setCreateThumbs={db.setCreateThumbs}
                    addCreateThumbFromInput={db.addCreateThumbFromInput}
                    createUploading={db.createUploading}
                    uploadCreateFiles={db.uploadCreateFiles}
                    saving={db.saving}
                    onCreate={db.onCreate}
                />
            )}

            {tab === "editor" && (
                <EditorStatusPanel
                    appError={db.error}
                    jsonDiagnostics={editorDiag}
                    setError={db.setError}
                    active={tab === "editor"}
                />
            )}
        </div>
    );

    const rightPanel =
        tab === "editor" ? (
            <EditorIdePanel
                active={tab === "editor"}
                mutationNonce={db.mutationNonce}
                setError={db.setError}
                refreshList={async () => {
                    await db.fetchItems(db.q, db.page);
                }}
                loadCurrentJson={db.loadCurrentEditorJson}
                onDiagnostics={setEditorDiag}
                asMain
            />
        ) : (
            <QuestionItemsPanel
                items={db.items}
                total={db.total}
                page={db.page}
                setPage={db.setPage}
                pageSize={db.pageSize}
                setPageSize={db.setPageSize}
                clampPage={db.clampPage}
                maxPages={db.maxPages}
                q={db.q}
                fetchItems={db.fetchItems}
                onDelete={db.onDelete}
                onOpenEdit={openEdit}
            />
        );

    return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
                <header className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Question DB</h1>
                        <p className="mt-2 text-sm text-zinc-300">
                            Local SQLite (FTS5). CRUD + query DSL.{" "}
                            {db.tokenizer ? <span className="text-zinc-400">Tokenizer: {db.tokenizer}</span> : null}
                        </p>
                    </div>

                    <LanguageToggleButton className="shrink-0" />
                </header>

                {db.error && (
                    <div className="mb-6 rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
                        {db.error}
                    </div>
                )}

                <div className="grid gap-4 lg:hidden">
                    {panels}

                    {tab === "editor" ? (
                        <EditorIdePanel
                            active={tab === "editor"}
                            mutationNonce={db.mutationNonce}
                            setError={db.setError}
                            refreshList={async () => {
                                await db.fetchItems(db.q, db.page);
                            }}
                            loadCurrentJson={db.loadCurrentEditorJson}
                            onDiagnostics={setEditorDiag}
                            asMain
                        />
                    ) : (
                        <QuestionItemsPanel
                            items={db.items}
                            total={db.total}
                            page={db.page}
                            setPage={db.setPage}
                            pageSize={db.pageSize}
                            setPageSize={db.setPageSize}
                            clampPage={db.clampPage}
                            maxPages={db.maxPages}
                            q={db.q}
                            fetchItems={db.fetchItems}
                            onDelete={db.onDelete}
                            onOpenEdit={openEdit}
                            dense
                        />
                    )}
                </div>

                <div className="hidden gap-4 lg:grid lg:grid-cols-[420px_1fr]">
                    <div className="space-y-4">{panels}</div>
                    {rightPanel}
                </div>
            </div>

            <EditQuestionDialog
                open={editOpen}
                item={editItem}
                onClose={() => setEditOpen(false)}
                onSaved={async (updated) => {
                    if (updated) db.setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
                    await db.fetchItems(db.q, db.page);
                    db.bumpMutation();
                }}
                setError={db.setError}
            />
        </div>
    );
}
