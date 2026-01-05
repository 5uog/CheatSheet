// FILE: src/app/page.tsx
"use client";

import { useState } from "react";
import { EditQuestionDialog } from "@/components/dialogs/edit-question-dialog";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { QuestionCreatePanel } from "@/components/panels/question-create-panel";
import { QuestionItemsPanel } from "@/components/panels/question-items-panel";
import { QuestionSearchPanel } from "@/components/panels/question-search-panel";
import { EditorIdePanel, type EditorDiagnostics } from "@/components/panels/editor-ide-panel";
import { EditorStatusPanel } from "@/components/panels/editor-status-panel";
import { useQuestionDb } from "@/components/hooks/use-question-db";
import type { Item } from "@/components/lib/question-types";

type PanelTab = "search" | "create" | "editor";

export default function Page() {
    const db = useQuestionDb();

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
                onChange={(t) => setTab(t)}
                tabs={[
                    { key: "search", label: "Search" },
                    { key: "create", label: "Create" },
                    { key: "editor", label: "Editor" },
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
                <header className="mb-6">
                    <h1 className="text-3xl font-semibold tracking-tight">Question DB</h1>
                    <p className="mt-2 text-sm text-zinc-300">
                        Local SQLite (FTS5). CRUD + query DSL.{" "}
                        {db.tokenizer ? <span className="text-zinc-400">Tokenizer: {db.tokenizer}</span> : null}
                    </p>
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
