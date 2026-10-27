import { NextResponse } from "next/server";
import { jsonError, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { deleteUser } from "@entities/user/service";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/users/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const userId = Number(id);
	if (!Number.isInteger(userId)) return jsonError("Invalid id");

	try {
		await deleteUser(userId, auth.id);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
