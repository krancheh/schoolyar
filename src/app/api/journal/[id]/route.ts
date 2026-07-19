import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireEmployee } from "@shared/lib/auth";
import { UpdateLessonInput, getLesson, updateLesson } from "@entities/journal/service";

export async function GET(_request: Request, ctx: RouteContext<"/api/journal/[id]">) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	try {
		return NextResponse.json({ lesson: await getLesson(lessonId) });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/journal/[id]">) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	const body = await parseBody<UpdateLessonInput>(request);

	try {
		const lesson = await updateLesson(lessonId, body ?? {});
		return NextResponse.json({ lesson });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
