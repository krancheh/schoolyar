import { NextResponse } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";

type AttendanceInput = {
	studentId?: number;
	status?: AttendanceStatus;
};

// Отметка посещаемости за урок (upsert по паре урок+ученик).
export async function PUT(
	request: Request,
	ctx: RouteContext<"/api/journal/[id]/attendance">
) {
	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	const body = await parseBody<{ attendance?: AttendanceInput[] }>(request);
	if (!body?.attendance?.length) {
		return jsonError("attendance array is required");
	}

	for (const record of body.attendance) {
		if (!record.studentId) return jsonError("Each record needs studentId");
		if (
			!record.status ||
			!Object.values(AttendanceStatus).includes(record.status)
		) {
			return jsonError(
				`Each record status must be one of: ${Object.values(AttendanceStatus).join(", ")}`
			);
		}
	}

	const lesson = await prisma.lesson.findUnique({
		where: { id: lessonId },
		select: { id: true },
	});
	if (!lesson) return jsonError("Lesson not found", 404);

	const studentIds = body.attendance.map((record) => record.studentId!);
	const students = await prisma.student.findMany({
		where: { id: { in: studentIds } },
		select: { id: true },
	});
	if (students.length !== new Set(studentIds).size) {
		return jsonError("One or more students not found", 404);
	}

	const attendance = await prisma.$transaction(
		body.attendance.map((record) =>
			prisma.attendance.upsert({
				where: {
					lessonId_studentId: { lessonId, studentId: record.studentId! },
				},
				create: {
					lessonId,
					studentId: record.studentId!,
					status: record.status!,
				},
				update: { status: record.status! },
			})
		)
	);

	return NextResponse.json({ attendance });
}
