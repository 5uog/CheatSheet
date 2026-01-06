/**
 * FILE: src/app/api/questions/[id]/route.ts
 *
 * This route module exposes mutation endpoints for a single question resource while keeping the
 * route layer constrained to transport responsibilities. It performs path-parameter decoding, a
 * bounded request-body read, and schema validation, then delegates normalization and persistence
 * to the questions domain service layer. Client input defects are reported deterministically as
 * 400-class JSON errors, and unexpected persistence failures are surfaced as 500 responses with a
 * stable `{ error }` shape, avoiding the use of thrown exceptions as part of normal validation flow.
 */

import { jsonError, jsonInvalidPayloadFromBodyRead, jsonOk } from "@/app/api/_shared/http";
import { readPositiveIntId } from "@/app/api/_shared/ids";
import { readJsonBodySafe } from "@/app/api/_shared/body";
import { UpdateSchema } from "@/app/api/questions/_schemas";
import * as service from "@/app/api/questions/_service";
import * as repo from "@/app/api/questions/_repo";

type Ctx = import("@/app/api/_shared/params").ParamsLike<{ id: string }>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: Ctx) {
    const id = await readPositiveIntId(ctx, "id");
    if (!id) return jsonError(400, { error: "bad id" });

    const bodyRead = await readJsonBodySafe(req, 1_000_000);
    if (!bodyRead.ok) return jsonInvalidPayloadFromBodyRead(bodyRead);

    const parsed = UpdateSchema.safeParse(bodyRead.data);
    if (!parsed.success) return jsonError(400, { error: "invalid payload", details: parsed.error.flatten() });

    const existing = repo.getById(id);
    if (!existing) return jsonError(404, { error: "not found" });

    const built = service.buildUpdatePayload({ existing, patch: parsed.data });
    if (!built.ok) return jsonError(400, { error: "invalid payload", details: { body: "empty" } });

    try {
        service.updateQuestionRobust({ id, ...built });
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
