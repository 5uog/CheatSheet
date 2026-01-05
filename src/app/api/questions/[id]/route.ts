// FILE: src/app/api/questions/[id]/route.ts
import { jsonError, jsonInvalidPayload, jsonOk } from "@/app/api/_shared/http";
import { readPositiveIntId } from "@/app/api/_shared/ids";
import { readJsonBodySafe } from "@/app/api/_shared/body";
import { UpdateSchema, normalizeStringArray, serializeAnswer } from "../_schemas";
import * as service from "../_service";
import * as repo from "../_repo";

type Ctx = import("@/app/api/_shared/params").ParamsLike<{ id: string }>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: Ctx) {
    const id = await readPositiveIntId(ctx, "id");
    if (!id) return jsonError(400, { error: "bad id" });

    const bodyRead = await readJsonBodySafe(req, 1_000_000);
    if (!bodyRead.ok) {
        const reason =
            bodyRead.error === "too_large"
                ? { body: "too large" }
                : bodyRead.error === "empty"
                    ? { body: "empty" }
                    : { body: "invalid json" };
        return jsonInvalidPayload(reason);
    }

    const parsed = UpdateSchema.safeParse(bodyRead.data);
    if (!parsed.success) {
        return jsonInvalidPayload(parsed.error.flatten());
    }

    const existing = repo.getById(id);
    if (!existing) return jsonError(404, { error: "not found" });

    const nextBody = (parsed.data.body ?? existing.body).trim();
    if (!nextBody) return jsonError(400, { error: "body cannot be empty" });

    const nextAnswer = parsed.data.answer ? serializeAnswer(parsed.data.answer) : existing.answer_json;

    const nextTags =
        parsed.data.tags != null ? JSON.stringify(normalizeStringArray(parsed.data.tags, 200)) : existing.tags_json;

    const nextThumbs =
        parsed.data.thumbnails != null
            ? JSON.stringify(normalizeStringArray(parsed.data.thumbnails, 200))
            : existing.thumbs_json;

    try {
        service.updateQuestionRobust({ id, nextBody, nextAnswer, nextTags, nextThumbs });
    } catch (e) {
        const msg = String((e as { message?: unknown } | null)?.message ?? "update failed");
        return jsonError(500, { error: msg });
    }

    let item: repo.QuestionItem | null = null;
    try {
        const row = repo.getById(id);
        item = row ? repo.mapRow(row) : null;
    } catch {
        item = null;
    }

    return jsonOk({ item });
}

export async function DELETE(_req: Request, ctx: Ctx) {
    const id = await readPositiveIntId(ctx, "id");
    if (!id) return jsonError(400, { error: "bad id" });

    try {
        service.deleteQuestionRobust(id);
    } catch (e) {
        const msg = String((e as { message?: unknown } | null)?.message ?? "delete failed");
        return jsonError(500, { error: msg });
    }

    return jsonOk({ ok: true });
}
