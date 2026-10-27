import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { UpdateTermInput, deleteTerm, updateTerm } from "@entities/term/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/terms/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const termId = Number(id);
	if (!Number.isInteger(termId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateTermInput>(request);

	try {
		const term = await updateTerm(termId, body ?? {});
		return NextResponse.json({ term });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/terms/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const termId = Number(id);
	if (!Number.isInteger(termId)) return jsonError("Invalid id");

	try {
		await deleteTerm(termId);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
