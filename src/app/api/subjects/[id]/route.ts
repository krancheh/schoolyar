import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { updateSubject } from "@entities/subject/service";

export async function PATCH(
	request: Request,
	ctx: RouteContext<"/api/subjects/[id]">
) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const subjectId = Number(id);
	if (!Number.isInteger(subjectId)) return jsonError("Invalid id");

	const body = await parseBody<{ name?: string }>(request);

	try {
		const subject = await updateSubject(subjectId, body ?? {});
		return NextResponse.json({ subject });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
