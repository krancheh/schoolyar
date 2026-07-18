import { NextResponse } from "next/server";
import {
	parseBody,
	parseDate,
	parseId,
	serviceErrorResponse,
} from "@shared/lib/api";
import { requireAuth, requireEmployee } from "@shared/lib/auth";
import {
	CreateLessonInput,
	createLesson,
	listLessons,
} from "@entities/journal/service";

// Журнал: дата, тема, д/з, средний балл за урок.
export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);

	return NextResponse.json({
		entries: await listLessons({
			classId: parseId(searchParams.get("classId")) ?? undefined,
			subjectId: parseId(searchParams.get("subjectId")) ?? undefined,
			from: parseDate(searchParams.get("from")) ?? undefined,
			to: parseDate(searchParams.get("to")) ?? undefined,
		}),
	});
}

export async function POST(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateLessonInput>(request);

	try {
		const lesson = await createLesson(body ?? {});
		return NextResponse.json({ lesson }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
