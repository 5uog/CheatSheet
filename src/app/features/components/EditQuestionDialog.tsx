// FILE: src/app/features/components/EditQuestionDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { TagsEditor } from "@/app/features/editors/TagsEditor";
import { ThumbnailsEditor } from "@/app/features/editors/ThumbnailsEditor";
import { ExplanationEditor } from "@/app/features/editors/ExplanationEditor";
import type { AnswerJson, Item } from "@/app/features/lib/question-types";
import { cls, normalizeExplanation, normalizeTags, normalizeThumbs } from "@/app/features/lib/question-utils";
import { apiUpdateQuestion } from "@/app/features/lib/question-api";
import { answerTypeLabel, safeInt } from "@/app/features/lib/answer-utils";
import { ModalShell } from"@/app/shared/ui/ModalShell";
import { useI18n } from "@/app/shared/i18n/client";

export function EditQuestionDialog(props: {
    open: boolean;
    item: Item | null;
    onClose: () => void;
    onSaved: (updated?: Item) => Promise<void> | void;
    setError: (msg: string | null) => void;
}) {
    const { open, item, onClose, onSaved, setError } = props;
    const { t } = useI18n();

    const [body, setBody] = useState("");
    const [explanation, setExplanation] = useState("");

    const [answerType, setAnswerType] = useState<AnswerJson["type"]>("boolean");

    const [boolValue, setBoolValue] = useState<0 | 1>(1);

    const [choiceOptions, setChoiceOptions] = useState<string[]>([""]);
    const [choiceCorrect, setChoiceCorrect] = useState<number[]>([0]);

    const [textValue, setTextValue] = useState("");
    const [blankValue, setBlankValue] = useState("");

    const [tags, setTags] = useState<string[]>([]);
    const [thumbs, setThumbs] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!item) return;

        setBody(item.body);
        setExplanation(item.explanation ?? "");
        setTags(normalizeTags(item.tags ?? []));
        setThumbs(normalizeThumbs(item.thumbnails ?? []));

        const a = item.answer;
        setAnswerType(a.type);

        if (a.type === "boolean") setBoolValue(a.value);
        if (a.type === "choice") {
            setChoiceOptions(a.options.length ? a.options : [""]);
            setChoiceCorrect(a.correct.length ? a.correct : [0]);
        }
        if (a.type === "text") setTextValue(a.value ?? "");
        if (a.type === "blank") setBlankValue(a.value ?? "");
    }, [item]);

    const computedAnswer: AnswerJson = useMemo(() => {
        if (answerType === "boolean") return { type: "boolean", value: boolValue };
        if (answerType === "choice") {
            const opts = choiceOptions.map((x) => x.trim()).filter(Boolean);
            const maxIdx = opts.length - 1;
            const corr = Array.from(new Set(choiceCorrect))
                .filter((n) => Number.isFinite(n))
                .map((n) => Math.trunc(n))
                .filter((n) => n >= 0 && n <= maxIdx);
            return { type: "choice", options: opts.length ? opts : ["(option)"], correct: corr.length ? corr : [0] };
        }
        if (answerType === "blank") return { type: "blank", value: blankValue };
        return { type: "text", value: textValue };
    }, [answerType, boolValue, choiceOptions, choiceCorrect, blankValue, textValue]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!item) return;

        const nextBody = body.trim();
        if (!nextBody) {
            setError(t("edit.body_empty"));
            return;
        }

        if (answerType === "choice") {
            const opts = choiceOptions.map((x) => x.trim()).filter(Boolean);
            if (opts.length === 0) {
                setError(t("edit.choice.need_option"));
                return;
            }
            const maxIdx = opts.length - 1;
            const corr = Array.from(new Set(choiceCorrect))
                .filter((n) => Number.isFinite(n))
                .map((n) => Math.trunc(n))
                .filter((n) => n >= 0 && n <= maxIdx);
            if (corr.length === 0) {
                setError(t("edit.choice.need_correct"));
                return;
            }
        }

        setSaving(true);
        setError(null);
        try {
            const r = await apiUpdateQuestion(item.id, {
                body: nextBody,
                answer: computedAnswer,
                explanation: normalizeExplanation(explanation),
                tags: normalizeTags(tags),
                thumbnails: normalizeThumbs(thumbs),
            });

            if (!r.ok) {
                setError(r.error);
                return;
            }

            await onSaved(r.data.item);
            onClose();
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell open={open && !!item} onClose={onClose} maxWidthClass="max-w-4xl">
            {item && (
                <>
                    <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-100">{t("edit.title")}</div>
                            <div className="text-xs text-zinc-500">
                                {t("edit.id")} {item.id}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                        >
                            {t("common.close")}
                        </button>
                    </div>

                    <div className="max-h-[80vh] overflow-y-auto overscroll-contain">
                        <form onSubmit={onSubmit} className="space-y-5 p-5">
                            <div className="space-y-2">
                                <label className="block text-xs text-zinc-400" htmlFor="editBody">
                                    {t("edit.body")}
                                </label>
                                <textarea
                                    id="editBody"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="min-h-40 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                />
                            </div>

                            <ExplanationEditor value={explanation} onChange={setExplanation} />

                            <div className="grid gap-4 lg:grid-cols-2">
                                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-zinc-200">{t("edit.answer")}</div>
                                        <div className="text-xs text-zinc-500">
                                            {t("edit.answer.current")}: {answerTypeLabel(answerType)}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="block text-xs text-zinc-400" htmlFor="ansType">
                                            {t("edit.answer.type")}
                                        </label>
                                        <select
                                            id="ansType"
                                            value={answerType}
                                            onChange={(e) => setAnswerType(e.target.value as AnswerJson["type"])}
                                            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                        >
                                            <option value="boolean">{t("edit.answer.boolean")}</option>
                                            <option value="choice">{t("edit.answer.choice")}</option>
                                            <option value="blank">{t("edit.answer.blank")}</option>
                                            <option value="text">{t("edit.answer.text")}</option>
                                        </select>
                                    </div>

                                    {answerType === "boolean" && (
                                        <fieldset className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-200">
                                            <legend className="px-1 text-xs text-zinc-400">{t("edit.answer.value")}</legend>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2" htmlFor="editTrue">
                                                    <input
                                                        id="editTrue"
                                                        type="radio"
                                                        name="editAnswerBool"
                                                        checked={boolValue === 1}
                                                        onChange={() => setBoolValue(1)}
                                                    />
                                                    {t("edit.answer.true")}
                                                </label>
                                                <label className="flex items-center gap-2" htmlFor="editFalse">
                                                    <input
                                                        id="editFalse"
                                                        type="radio"
                                                        name="editAnswerBool"
                                                        checked={boolValue === 0}
                                                        onChange={() => setBoolValue(0)}
                                                    />
                                                    {t("edit.answer.false")}
                                                </label>
                                            </div>
                                        </fieldset>
                                    )}

                                    {answerType === "choice" && (
                                        <div className="mt-4 space-y-3">
                                            <div className="text-xs text-zinc-400">{t("edit.choice.options")}</div>
                                            <div className="space-y-2">
                                                {choiceOptions.map((v, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <input
                                                            value={v}
                                                            onChange={(e) => {
                                                                const next = [...choiceOptions];
                                                                next[i] = e.target.value;
                                                                setChoiceOptions(next);
                                                            }}
                                                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                                            placeholder={`Option ${i + 1}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setChoiceOptions((xs) => xs.filter((_, j) => j !== i));
                                                                setChoiceCorrect((cs) =>
                                                                    cs.filter((n) => n !== i).map((n) => (n > i ? n - 1 : n))
                                                                );
                                                            }}
                                                            className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                                        >
                                                            {t("common.remove")}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setChoiceOptions((xs) => [...xs, ""])}
                                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                                >
                                                    {t("common.add")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const max = choiceOptions.length - 1;
                                                        setChoiceCorrect((cs) =>
                                                            (cs.length ? cs : [0]).filter((n) => n >= 0 && n <= max)
                                                        );
                                                    }}
                                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-950/70"
                                                >
                                                    {t("common.normalize")}
                                                </button>
                                            </div>

                                            <div className="text-xs text-zinc-400">{t("edit.choice.correct_indices")}</div>
                                            <input
                                                value={choiceCorrect.join(",")}
                                                onChange={(e) => {
                                                    const parts = e.target.value
                                                        .split(",")
                                                        .map((x) => x.trim())
                                                        .filter(Boolean);
                                                    const nums: number[] = [];
                                                    for (const p of parts) {
                                                        const n = safeInt(p);
                                                        if (n == null) continue;
                                                        nums.push(n);
                                                    }
                                                    setChoiceCorrect(Array.from(new Set(nums)));
                                                }}
                                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                                placeholder="e.g. 0,2"
                                            />

                                            <div className="text-xs text-zinc-500">{t("edit.choice.index_hint")}</div>
                                        </div>
                                    )}

                                    {answerType === "blank" && (
                                        <div className="mt-4 space-y-2">
                                            <label className="block text-xs text-zinc-400" htmlFor="blankValue">
                                                {t("edit.blank.label")}
                                            </label>
                                            <input
                                                id="blankValue"
                                                value={blankValue}
                                                onChange={(e) => setBlankValue(e.target.value)}
                                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                                placeholder={t("edit.blank.placeholder")}
                                            />
                                        </div>
                                    )}

                                    {answerType === "text" && (
                                        <div className="mt-4 space-y-2">
                                            <label className="block text-xs text-zinc-400" htmlFor="textValue">
                                                {t("edit.text.label")}
                                            </label>
                                            <textarea
                                                id="textValue"
                                                value={textValue}
                                                onChange={(e) => setTextValue(e.target.value)}
                                                className="min-h-24 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                                                placeholder={t("edit.text.placeholder")}
                                            />
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-4">
                                    <TagsEditor value={tags} onChange={setTags} />
                                    <ThumbnailsEditor value={thumbs} onChange={setThumbs} setError={setError} enableUpload />
                                </section>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/70"
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={cls(
                                        "rounded-xl px-3 py-2 text-sm font-medium",
                                        "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
                                        saving && "opacity-60"
                                    )}
                                >
                                    {t("common.save")}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </ModalShell>
    );
}
