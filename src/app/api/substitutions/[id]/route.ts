import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import {
	UpdateSubstitutionInput,
	updateSubstitution,
} from "@entities/substitution/service";

export async function PATCH(
	request: Request,
	ctx: RouteContext<"/api/substitutions/[id]">
) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const substitutionId = Number(id);
	if (!Number.isInteger(substitutionId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateSubstitutionInput>(request);

	try {
		const substitution = await updateSubstitution(substitutionId, body ?? {});
		return NextResponse.json({ substitution });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
