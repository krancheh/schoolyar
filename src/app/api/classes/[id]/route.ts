import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { UpdateClassInput, updateClass } from "@entities/class/service";

export async function PATCH(
	request: Request,
	ctx: RouteContext<"/api/classes/[id]">
) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const classId = Number(id);
	if (!Number.isInteger(classId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateClassInput>(request);

	try {
		const updatedClass = await updateClass(classId, body ?? {});
		return NextResponse.json({ class: updatedClass });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
