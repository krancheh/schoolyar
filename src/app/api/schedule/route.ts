import { NextResponse } from "next/server";
import { parseBody, parseId, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateScheduleSlotInput,
	createScheduleSlot,
	listScheduleSlots,
} from "@entities/schedule/service";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);

	return NextResponse.json({
		slots: await listScheduleSlots({
			classId: parseId(searchParams.get("classId")) ?? undefined,
			termId: parseId(searchParams.get("termId")) ?? undefined,
			teacherId: parseId(searchParams.get("teacherId")) ?? undefined,
		}),
	});
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateScheduleSlotInput>(request);

	try {
		const slot = await createScheduleSlot(body ?? {});
		return NextResponse.json({ slot }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
