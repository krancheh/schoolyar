import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";

type GradeInput = {
	studentId?: number;
	value?: number;
	comment?: string;
};

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
	if (!body?.grades?.length) {
		return jsonError("grades array is required");
	}

	for (const grade of body.grades) {
		if (!grade.studentId) return jsonError("Each grade needs studentId");
		if (
			!Number.isInteger(grade.value) ||
			grade.value! < 1 ||
			grade.value! > 5
		) {
			return jsonError("Each grade value must be an integer from 1 to 5");
		}
	}

	const lesson = await prisma.lesson.findUnique({
		where: { id: lessonId },
		select: { id: true, classId: true },
	});
	if (!lesson) return jsonError("Lesson not found", 404);

	const studentIds = body.grades.map((grade) => grade.studentId!);
	const students = await prisma.student.findMany({
		where: { id: { in: studentIds } },
		select: { id: true },
	});
	if (students.length !== new Set(studentIds).size) {
		return jsonError("One or more students not found", 404);
	}

	const grades = await prisma.$transaction(
		body.grades.map((grade) =>
			prisma.grade.upsert({
				where: {
					lessonId_studentId: { lessonId, studentId: grade.studentId! },
				},
				create: {
					lessonId,
					studentId: grade.studentId!,
					value: grade.value!,
					comment: grade.comment,
				},
				update: { value: grade.value!, comment: grade.comment },
			})
		)
	);

	return NextResponse.json({ grades });
}
