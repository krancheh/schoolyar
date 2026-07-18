import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";
import { requireAuth, requireEmployee } from "@shared/lib/auth";

export async function GET(
	_request: Request,
	ctx: RouteContext<"/api/journal/[id]">
) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	const lesson = await prisma.lesson.findUnique({
		where: { id: lessonId },
		include: {
			class: { select: { id: true, name: true } },
			subject: { select: { id: true, name: true } },
			teacher: { select: { id: true, fullName: true } },
			grades: {
				include: { student: { select: { id: true, fullName: true } } },
			},
			attendance: {
				include: { student: { select: { id: true, fullName: true } } },
			},
		},
	});

	if (!lesson) return jsonError("Lesson not found", 404);

	const averageGrade =
		lesson.grades.length > 0
			? Math.round(
					(lesson.grades.reduce((sum, grade) => sum + grade.value, 0) /
						lesson.grades.length) *
						100
				) / 100
			: null;

	return NextResponse.json({ lesson: { ...lesson, averageGrade } });
}

type UpdateLessonBody = {
	topic?: string | null;
	homework?: string | null;
};

export async function PATCH(
	request: Request,
	ctx: RouteContext<"/api/journal/[id]">
) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const lessonId = Number(id);
	if (!Number.isInteger(lessonId)) return jsonError("Invalid lesson id");

	const body = await parseBody<UpdateLessonBody>(request);
	if (!body || (body.topic === undefined && body.homework === undefined)) {
		return jsonError("Nothing to update: provide topic and/or homework");
	}

	const existing = await prisma.lesson.findUnique({ where: { id: lessonId } });
	if (!existing) return jsonError("Lesson not found", 404);

	const lesson = await prisma.lesson.update({
		where: { id: lessonId },
		data: {
			...(body.topic !== undefined ? { topic: body.topic } : {}),
			...(body.homework !== undefined ? { homework: body.homework } : {}),
		},
	});

	return NextResponse.json({ lesson });
}
