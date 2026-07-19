import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { UpdateScheduleSlotInput, updateScheduleSlot } from "@entities/schedule/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/schedule/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const slotId = Number(id);
	if (!Number.isInteger(slotId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateScheduleSlotInput>(request);

	try {
		const slot = await updateScheduleSlot(slotId, body ?? {});
		return NextResponse.json({ slot });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
