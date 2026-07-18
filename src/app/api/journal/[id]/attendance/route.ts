import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";
import { AttendanceInput, setAttendance } from "@entities/journal/service";

// Отметка посещаемости за урок (upsert по паре урок+ученик).
export async function PUT(
	request: Request,
	ctx: RouteContext<"/api/journal/[id]/attendance">
) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	const body = await parseBody<{ attendance?: AttendanceInput[] }>(request);

	try {
		const attendance = await setAttendance(lessonId, body?.attendance ?? []);
		return NextResponse.json({ attendance });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
