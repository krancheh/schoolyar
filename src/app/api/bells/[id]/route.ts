import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { UpdateBellInput, updateBell } from "@entities/bell-schedule/service";

export async function PATCH(
	request: Request,
	ctx: RouteContext<"/api/bells/[id]">
) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const bellId = Number(id);
	if (!Number.isInteger(bellId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateBellInput>(request);

	try {
		const bell = await updateBell(bellId, body ?? {});
		return NextResponse.json({ bell });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
