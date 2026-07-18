import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";
import { GradeInput, setGrades } from "@entities/journal/service";

// Выставление оценок за урок (upsert по паре урок+ученик).
export async function PUT(
	request: Request,
	ctx: RouteContext<"/api/journal/[id]/grades">
) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	const body = await parseBody<{ grades?: GradeInput[] }>(request);

	try {
		const grades = await setGrades(lessonId, body?.grades ?? []);
		return NextResponse.json({ grades });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
