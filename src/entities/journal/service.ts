import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, parseDate } from "@shared/lib/api";
import { addDays } from "@shared/lib/format";

// Средний балл всегда считается по оценкам, в БД не хранится.
function averageOf(grades: { value: number }[]): number | null {
	if (grades.length === 0) return null;
	return (
		Math.round((grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length) * 100) /
		100
	);
}

export async function listLessons(
	filters: {
		classId?: number;
		subjectId?: number;
		from?: Date;
		to?: Date;
	} = {},
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

// Учебная неделя журнала: понедельник–суббота.
const WEEK_DAYS_SHOWN = 6;

function weekRange(weekStart: Date) {
	return { from: weekStart, to: addDays(weekStart, WEEK_DAYS_SHOWN - 1) };
}

// Диапазон дат учебного периода (четверти), в который попадает неделя.
// Если неделя пересекает границу периодов — берётся объединение диапазонов.
async function termRangeForWeek(academicYearId: number, from: Date, to: Date) {
	const terms = await prisma.term.findMany({
		where: { academicYearId, startDate: { lte: to }, endDate: { gte: from } },
		select: { startDate: true, endDate: true },
	});
	if (terms.length === 0) return null;
	return {
		from: new Date(Math.min(...terms.map((term) => term.startDate.getTime()))),
		to: new Date(Math.max(...terms.map((term) => term.endDate.getTime()))),
	};
}

function byDateAndLessonNumber(
	a: { date: Date; scheduleSlot: { lessonNumber: number } | null; id: number },
	b: { date: Date; scheduleSlot: { lessonNumber: number } | null; id: number },
) {
	return (
		a.date.getTime() - b.date.getTime() ||
		(a.scheduleSlot?.lessonNumber ?? 99) - (b.scheduleSlot?.lessonNumber ?? 99) ||
		a.id - b.id
	);
}

export type StudentWeekLesson = {
	id: number;
	date: Date;
	lessonNumber: number | null;
	subject: { id: number; name: string };
	teacher: { id: number; fullName: string };
	topic: string | null;
	homework: string | null;
	grade: { value: number; comment: string | null } | null;
	// средний балл ученика по этому предмету за учебный период
	subjectAverage: number | null;
};

// Дневник ученика за неделю: уроки его класса с личными оценками
// и средним баллом по каждому предмету за текущую четверть.
export async function getStudentWeekJournal(
	classId: number,
	studentId: number,
	weekStart: Date,
): Promise<StudentWeekLesson[]> {
	const { from, to } = weekRange(weekStart);
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		select: { academicYearId: true },
	});
	if (!cls) return [];

	const [lessons, range] = await Promise.all([
		prisma.lesson.findMany({
			where: { classId, date: { gte: from, lte: to } },
			include: {
				subject: { select: { id: true, name: true } },
				teacher: { select: { id: true, fullName: true } },
				scheduleSlot: { select: { lessonNumber: true } },
				grades: { where: { studentId }, select: { value: true, comment: true } },
			},
		}),
		termRangeForWeek(cls.academicYearId, from, to),
	]);

	const subjectAverage = new Map<number, number>();
	if (range) {
		const termGrades = await prisma.grade.findMany({
			where: {
				studentId,
				lesson: { classId, date: { gte: range.from, lte: range.to } },
			},
			select: { value: true, lesson: { select: { subjectId: true } } },
		});
		const bySubject = new Map<number, { value: number }[]>();
		for (const grade of termGrades) {
			const list = bySubject.get(grade.lesson.subjectId) ?? [];
			list.push(grade);
			bySubject.set(grade.lesson.subjectId, list);
		}
		for (const [subjectId, values] of bySubject) {
			subjectAverage.set(subjectId, averageOf(values)!);
		}
	}

	return lessons
		.slice()
		.sort(byDateAndLessonNumber)
		.map((lesson) => ({
			id: lesson.id,
			date: lesson.date,
			lessonNumber: lesson.scheduleSlot?.lessonNumber ?? null,
			subject: lesson.subject,
			teacher: lesson.teacher,
			topic: lesson.topic,
			homework: lesson.homework,
			grade: lesson.grades[0] ?? null,
			subjectAverage: subjectAverage.get(lesson.subject.id) ?? null,
		}));
}

export type GradeGridLesson = {
	id: number;
	date: Date;
	lessonNumber: number | null;
	topic: string | null;
	homework: string | null;
	teacher: { id: number; fullName: string };
	averageGrade: number | null;
	grades: { studentId: number; value: number; comment: string | null }[];
};

export type GradeGridStudent = {
	id: number;
	fullName: string;
	// итоговый средний по предмету за учебный период
	termAverage: number | null;
};

// Сетка журнала для учителя: ученики класса × уроки предмета за неделю,
// плюс итоговый средний балл каждого ученика за текущую четверть.
export async function getGradeGrid(
	classId: number,
	subjectId: number,
	weekStart: Date,
): Promise<{ students: GradeGridStudent[]; lessons: GradeGridLesson[] }> {
	const { from, to } = weekRange(weekStart);
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		select: { academicYearId: true },
	});
	if (!cls) throw new ServiceError("Class not found", 404);

	const [students, lessons, range] = await Promise.all([
		prisma.student.findMany({
			where: { classId, isActive: true },
			orderBy: { fullName: "asc" },
			select: { id: true, fullName: true },
		}),
		prisma.lesson.findMany({
			where: { classId, subjectId, date: { gte: from, lte: to } },
			include: {
				teacher: { select: { id: true, fullName: true } },
				scheduleSlot: { select: { lessonNumber: true } },
				grades: { select: { studentId: true, value: true, comment: true } },
			},
		}),
		termRangeForWeek(cls.academicYearId, from, to),
	]);

	const termAverage = new Map<number, number>();
	if (range) {
		const termGrades = await prisma.grade.findMany({
			where: {
				lesson: { classId, subjectId, date: { gte: range.from, lte: range.to } },
			},
			select: { studentId: true, value: true },
		});
		const byStudent = new Map<number, { value: number }[]>();
		for (const grade of termGrades) {
			const list = byStudent.get(grade.studentId) ?? [];
			list.push(grade);
			byStudent.set(grade.studentId, list);
		}
		for (const [studentId, values] of byStudent) {
			termAverage.set(studentId, averageOf(values)!);
		}
	}

	return {
		students: students.map((student) => ({
			...student,
			termAverage: termAverage.get(student.id) ?? null,
		})),
		lessons: lessons
			.slice()
			.sort(byDateAndLessonNumber)
			.map((lesson) => ({
				id: lesson.id,
				date: lesson.date,
				lessonNumber: lesson.scheduleSlot?.lessonNumber ?? null,
				topic: lesson.topic,
				homework: lesson.homework,
				teacher: lesson.teacher,
				averageGrade: averageOf(lesson.grades),
				grades: lesson.grades,
			})),
	};
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
			throw new ServiceError(`ScheduleSlot ${input.scheduleSlotId} not found`, 404);
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
		if (!Number.isInteger(grade.value) || grade.value! < 1 || grade.value! > 5) {
			throw new ServiceError("Each grade value must be an integer from 1 to 5");
		}
	}

	await ensureLessonAndStudents(
		lessonId,
		grades.map((grade) => grade.studentId!),
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
			}),
		),
	);
}

export type AttendanceInput = {
	studentId?: number;
	status?: AttendanceStatus;
};

// Отметка посещаемости за урок (upsert по паре урок+ученик).
export async function setAttendance(lessonId: number, records: AttendanceInput[]) {
	if (records.length === 0) {
		throw new ServiceError("attendance array is required");
	}

	for (const record of records) {
		if (!record.studentId) throw new ServiceError("Each record needs studentId");
		if (!record.status || !Object.values(AttendanceStatus).includes(record.status)) {
			throw new ServiceError(
				`Each record status must be one of: ${Object.values(AttendanceStatus).join(", ")}`,
			);
		}
	}

	await ensureLessonAndStudents(
		lessonId,
		records.map((record) => record.studentId!),
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
			}),
		),
	);
}
