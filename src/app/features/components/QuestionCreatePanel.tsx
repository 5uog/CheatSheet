// FILE: src/app/features/panels/QuestionCreatePanel.tsx
"use client";

import type React from "react";
import type { Kind } from "@/app/features/lib/question-types";
import { isNewKind } from "@/app/features/lib/question-types";
import { cls } from "@/app/features/lib/question-utils";
import { TagsEditor } from "@/app/features/editors/TagsEditor";
import { ThumbnailsEditor } from "@/app/features/editors/ThumbnailsEditor";
import { ExplanationEditor } from "@/app/features/editors/ExplanationEditor";
import { useI18n } from "@/app/shared/i18n/client";

export function QuestionCreatePanel(props: {
    newBody: string;
    setNewBody: React.Dispatch<React.SetStateAction<string>>;

    newExplanation: string;
    setNewExplanation: React.Dispatch<React.SetStateAction<string>>;

    newKind: Exclude<Kind, "blank">;
    setNewKind: React.Dispatch<React.SetStateAction<Exclude<Kind, "blank">>>;

    newOptions: string[];
    setNewOptions: React.Dispatch<React.SetStateAction<string[]>>;

    newCorrectIndices: number[];
    setNewCorrectIndices: React.Dispatch<React.SetStateAction<number[]>>;

    newCorrectText: string;
    setNewCorrectText: React.Dispatch<React.SetStateAction<string>>;

    createTagInput: string;
    setCreateTagInput: React.Dispatch<React.SetStateAction<string>>;
    createTags: string[];
    setCreateTags: React.Dispatch<React.SetStateAction<string[]>>;
    addCreateTagFromInput: () => void;

    createThumbUrl: string;
    setCreateThumbUrl: React.Dispatch<React.SetStateAction<string>>;
    createThumbs: string[];
    setCreateThumbs: React.Dispatch<React.SetStateAction<string[]>>;
    addCreateThumbFromInput: () => void;

    createUploading: boolean;
    uploadCreateFiles: (files: FileList | null) => Promise<void>;

    saving: boolean;
    onCreate: (e: React.FormEvent) => Promise<void>;

    setError?: (msg: string | null) => void;
}) {
    const {
        newBody,
        setNewBody,
        newExplanation,
        setNewExplanation,
        newKind,
        setNewKind,
        newOptions,
        setNewOptions,
        newCorrectIndices,
        setNewCorrectIndices,
        newCorrectText,
        setNewCorrectText,
        createTagInput,
        setCreateTagInput,
        createTags,
        setCreateTags,
        createThumbUrl,
        setCreateThumbUrl,
        createThumbs,
        setCreateThumbs,
        createUploading,
        uploadCreateFiles,
        saving,
        onCreate,
        setError,
    } = props;

    const { t } = useI18n();

    return (
        <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl">
            <div className="border-b border-zinc-800 px-5 py-4">
                <div className="text-sm font-medium text-zinc-100">{t("create.title")}</div>
                <div className="mt-1 text-xs text-zinc-500">{t("create.subtitle")}</div>
            </div>

            <form onSubmit={onCreate} className="space-y-5 p-5">
                <div className="space-y-2">
                    <label className="block text-xs text-zinc-400" htmlFor="newKind">
                        {t("create.kind")}
                    </label>
                    <select
                        id="newKind"
                        value={newKind}
                        onChange={(e) => {
                            const v = e.target.value.trim();
                            setNewKind(isNewKind(v) ? v : "boolean");
                        }}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                    >
                        <option value="boolean">{t("edit.answer.boolean")}</option>
                        <option value="choice">{t("edit.answer.choice")}</option>
                        <option value="text">{t("edit.answer.text")}</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs text-zinc-400" htmlFor="newBody">
                        {t("create.body")}
                    </label>
                    <textarea
                        id="newBody"
                        value={newBody}
                        onChange={(e) => setNewBody(e.target.value)}
                        className="min-h-40 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                        placeholder={t("create.body.placeholder")}
                    />
                </div>

                <ExplanationEditor value={newExplanation} onChange={setNewExplanation} />

                <section className="space-y-4">
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-zinc-200">{t("create.answer.title")}</div>
                            <div className="text-xs text-zinc-500">
                                {t("create.answer.type")}:{" "}
                                {newKind === "boolean" ? "Boolean" : newKind === "choice" ? "Choice" : "Text"}
                            </div>
                        </div>

                        {newKind !== "text" && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-zinc-400">{t("create.answer.options")}</div>
                                    {newKind === "choice" && (
                                        <button
                                            type="button"
                                            onClick={() => setNewOptions((xs) => [...xs, ""])}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                        >
                                            {t("create.answer.add_option")}
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {(newKind === "boolean" ? ["True", "False"] : newOptions).map((opt, idx) => {
                                        const isBool = newKind === "boolean";
                                        const checked = newCorrectIndices.includes(idx);
                                        const multi = newKind === "choice";

                                        return (
                                            <div key={`${idx}-${isBool ? "b" : "c"}`} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Mark option ${idx + 1} correct`}
                                                    checked={checked}
                                                    onChange={() => {
                                                        setNewCorrectIndices((prev) => {
                                                            const has = prev.includes(idx);
                                                            if (has) return prev.filter((x) => x !== idx);
                                                            const next = multi ? [...prev, idx] : [idx];
                                                            return next;
                                                        });
                                                    }}
                                                />
                                                <input
                                                    aria-label={`Option ${idx + 1}`}
                                                    value={opt}
                                                    disabled={isBool}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setNewOptions((xs) => xs.map((x, i) => (i === idx ? v : x)));
                                                    }}
                                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                                    placeholder={`Option ${idx + 1}`}
                                                />
                                                {!isBool && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove option ${idx + 1}`}
                                                        onClick={() => {
                                                            setNewOptions((xs) => xs.filter((_, i) => i !== idx));
                                                            setNewCorrectIndices((prev) =>
                                                                prev.filter((x) => x !== idx).map((x) => (x > idx ? x - 1 : x))
                                                            );
                                                        }}
                                                        className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                                    >
                                                        {t("common.remove")}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="text-xs text-zinc-500">{t("create.answer.check_hint")}</div>
                            </div>
                        )}

                        {newKind === "text" && (
                            <div className="mt-4 space-y-2">
                                <label className="block text-xs text-zinc-400" htmlFor="newCorrectText">
                                    {t("create.text.correct_label")}
                                </label>
                                <textarea
                                    id="newCorrectText"
                                    value={newCorrectText}
                                    onChange={(e) => setNewCorrectText(e.target.value)}
                                    className="min-h-24 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                    placeholder={t("create.text.correct_placeholder")}
                                />
                            </div>
                        )}
                    </section>

                    <TagsEditor
                        value={createTags}
                        onChange={(next) => setCreateTags(next)}
                        inputValue={createTagInput}
                        setInputValue={(v) => setCreateTagInput(v)}
                        title={t("tags.title")}
                    />

                    <ThumbnailsEditor
                        value={createThumbs}
                        onChange={(next) => setCreateThumbs(next)}
                        title={t("thumbs.title")}
                        setError={setError}
                        enableUpload
                        urlInputValue={createThumbUrl}
                        setUrlInputValue={(v) => setCreateThumbUrl(v)}
                        uploadFiles={uploadCreateFiles}
                        uploading={createUploading}
                    />
                </section>

                <div className="flex items-center justify-end gap-2">
                    <button
                        type="submit"
                        disabled={saving || createUploading}
                        className={cls(
                            "rounded-xl px-3 py-2 text-sm font-medium",
                            "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
                            (saving || createUploading) && "opacity-60"
                        )}
                    >
                        {t("common.create")}
                    </button>
                </div>
            </form>
        </section>
    );
}
