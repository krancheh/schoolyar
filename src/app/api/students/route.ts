import { NextResponse } from "next/server";
import { parseBody, parseId, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateStudentInput,
	createStudent,
	listStudents,
} from "@entities/student/service";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const classId = parseId(searchParams.get("classId"));

	return NextResponse.json({
		students: await listStudents({ classId: classId ?? undefined }),
	});
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateStudentInput>(request);

	try {
		const student = await createStudent(body ?? {});
		return NextResponse.json({ student }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
