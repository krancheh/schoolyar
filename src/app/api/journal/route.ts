import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseDate, parseId } from "@shared/lib/api";
import { requireAuth, requireEmployee } from "@shared/lib/auth";

// Журнал: дата, тема, д/з, средний балл за урок.
export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const classId = parseId(searchParams.get("classId"));
	const subjectId = parseId(searchParams.get("subjectId"));
	const from = parseDate(searchParams.get("from"));
	const to = parseDate(searchParams.get("to"));

	const lessons = await prisma.lesson.findMany({
		where: {
			...(classId ? { classId } : {}),
			...(subjectId ? { subjectId } : {}),
			...(from || to
				? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
				: {}),
		},
		include: {
			class: { select: { id: true, name: true } },
			subject: { select: { id: true, name: true } },
			teacher: { select: { id: true, fullName: true } },
			grades: { select: { value: true } },
		},
		orderBy: { date: "asc" },
	});

	const entries = lessons.map(({ grades, ...lesson }) => ({
		...lesson,
		averageGrade:
			grades.length > 0
				? Math.round(
						(grades.reduce((sum, grade) => sum + grade.value, 0) /
							grades.length) *
							100
					) / 100
				: null,
		gradesCount: grades.length,
	}));

	return NextResponse.json({ entries });
}

type CreateLessonBody = {
	date?: string;
	classId?: number;
	subjectId?: number;
	teacherId?: number;
	scheduleSlotId?: number;
	topic?: string;
	homework?: string;
};

export async function POST(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateLessonBody>(request);

	if (!body?.classId || !body.subjectId || !body.teacherId) {
		return jsonError("classId, subjectId and teacherId are required");
	}

	const date = parseDate(body.date);
	if (!date) return jsonError("date must be a valid date (YYYY-MM-DD)");

	if (body.scheduleSlotId) {
		const slot = await prisma.scheduleSlot.findUnique({
			where: { id: body.scheduleSlotId },
		});
		if (!slot) {
			return jsonError(`ScheduleSlot ${body.scheduleSlotId} not found`, 404);
		}
	}

	const lesson = await prisma.lesson.create({
		data: {
			date,
			classId: body.classId,
			subjectId: body.subjectId,
			teacherId: body.teacherId,
			scheduleSlotId: body.scheduleSlotId,
			topic: body.topic,
			homework: body.homework,
		},
	});

	return NextResponse.json({ lesson }, { status: 201 });
}
