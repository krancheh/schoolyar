import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, parseDate } from "@shared/lib/api";

// Средний балл всегда считается по оценкам, в БД не хранится.
function averageOf(grades: { value: number }[]): number | null {
	if (grades.length === 0) return null;
	return (
		Math.round(
			(grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length) *
				100
		) / 100
	);
}

export async function listLessons(
	filters: {
		classId?: number;
		subjectId?: number;
		from?: Date;
		to?: Date;
	} = {}
) {
	const { classId, subjectId, from, to } = filters;

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

	return lessons.map(({ grades, ...lesson }) => ({
		...lesson,
		averageGrade: averageOf(grades),
		gradesCount: grades.length,
	}));
}

export async function getLesson(lessonId: number) {
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

	if (!lesson) throw new ServiceError("Lesson not found", 404);

	return { ...lesson, averageGrade: averageOf(lesson.grades) };
}

export type CreateLessonInput = {
	date?: string | Date;
	classId?: number;
	subjectId?: number;
	teacherId?: number;
	scheduleSlotId?: number;
	topic?: string;
	homework?: string;
};

export async function createLesson(input: CreateLessonInput) {
	if (!input.classId || !input.subjectId || !input.teacherId) {
		throw new ServiceError("classId, subjectId and teacherId are required");
	}

	const date = parseDate(input.date);
	if (!date) throw new ServiceError("date must be a valid date (YYYY-MM-DD)");

	if (input.scheduleSlotId) {
		const slot = await prisma.scheduleSlot.findUnique({
			where: { id: input.scheduleSlotId },
		});
		if (!slot) {
			throw new ServiceError(
				`ScheduleSlot ${input.scheduleSlotId} not found`,
				404
			);
		}
	}

	return prisma.lesson.create({
		data: {
			date,
			classId: input.classId,
			subjectId: input.subjectId,
			teacherId: input.teacherId,
			scheduleSlotId: input.scheduleSlotId,
			topic: input.topic,
			homework: input.homework,
		},
	});
}

export type UpdateLessonInput = {
	topic?: string | null;
	homework?: string | null;
};

export async function updateLesson(lessonId: number, input: UpdateLessonInput) {
	if (input.topic === undefined && input.homework === undefined) {
		throw new ServiceError("Nothing to update: provide topic and/or homework");
	}

	const existing = await prisma.lesson.findUnique({ where: { id: lessonId } });
	if (!existing) throw new ServiceError("Lesson not found", 404);

	return prisma.lesson.update({
		where: { id: lessonId },
		data: {
			...(input.topic !== undefined ? { topic: input.topic } : {}),
			...(input.homework !== undefined ? { homework: input.homework } : {}),
		},
	});
}

async function ensureLessonAndStudents(lessonId: number, studentIds: number[]) {
	const lesson = await prisma.lesson.findUnique({
		where: { id: lessonId },
		select: { id: true },
	});
	if (!lesson) throw new ServiceError("Lesson not found", 404);

	const students = await prisma.student.findMany({
		where: { id: { in: studentIds } },
		select: { id: true },
	});
	if (students.length !== new Set(studentIds).size) {
		throw new ServiceError("One or more students not found", 404);
	}
}

export type GradeInput = {
	studentId?: number;
	value?: number;
	comment?: string;
};

// Выставление оценок за урок (upsert по паре урок+ученик).
export async function setGrades(lessonId: number, grades: GradeInput[]) {
	if (grades.length === 0) throw new ServiceError("grades array is required");

	for (const grade of grades) {
		if (!grade.studentId) throw new ServiceError("Each grade needs studentId");
		if (
			!Number.isInteger(grade.value) ||
			grade.value! < 1 ||
			grade.value! > 5
		) {
			throw new ServiceError("Each grade value must be an integer from 1 to 5");
		}
	}

	await ensureLessonAndStudents(
		lessonId,
		grades.map((grade) => grade.studentId!)
	);

	return prisma.$transaction(
		grades.map((grade) =>
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
}

export type AttendanceInput = {
	studentId?: number;
	status?: AttendanceStatus;
};

// Отметка посещаемости за урок (upsert по паре урок+ученик).
export async function setAttendance(
	lessonId: number,
	records: AttendanceInput[]
) {
	if (records.length === 0) {
		throw new ServiceError("attendance array is required");
	}

	for (const record of records) {
		if (!record.studentId) throw new ServiceError("Each record needs studentId");
		if (
			!record.status ||
			!Object.values(AttendanceStatus).includes(record.status)
		) {
			throw new ServiceError(
				`Each record status must be one of: ${Object.values(AttendanceStatus).join(", ")}`
			);
		}
	}

	await ensureLessonAndStudents(
		lessonId,
		records.map((record) => record.studentId!)
	);

	return prisma.$transaction(
		records.map((record) =>
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
}
