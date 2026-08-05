import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, isoDayOfWeek, parseDate } from "@shared/lib/api";
import { addDays, formatDateInput } from "@shared/lib/format";

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
	// null — урок есть в расписании, но запись журнала ещё не создана
	id: number | null;
	scheduleSlotId: number | null;
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
	// средний балл по предмету за выбранный период (считается, не хранится)
	termAverage: number | null;
	// итоговая оценка за период, выставленная учителем
	termGrade: number | null;
	// годовая («итоговая») оценка
	yearGrade: number | null;
};

// Сетка журнала для учителя: ученики класса × все уроки предмета за учебный
// период (четверть/триместр/семестр), плюс средний балл и итоговые оценки.
// Уроки — объединение расписания и фактических записей журнала: запись
// мержится со слотом по паре (scheduleSlotId, дата), уроки из расписания
// без записи возвращаются с id = null.
export async function getGradeGrid(
	classId: number,
	subjectId: number,
	termId: number,
): Promise<{ students: GradeGridStudent[]; lessons: GradeGridLesson[] }> {
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		select: { academicYearId: true },
	});
	if (!cls) throw new ServiceError("Class not found", 404);
	const term = await prisma.term.findUnique({ where: { id: termId } });
	if (!term || term.academicYearId !== cls.academicYearId) {
		throw new ServiceError("Term not found", 404);
	}
	const from = term.startDate;
	const to = term.endDate;

	const [students, lessons, slots, termGradeRows, yearGradeRows] = await Promise.all([
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
		prisma.scheduleSlot.findMany({
			where: { classId, subjectId, termId },
			select: {
				id: true,
				dayOfWeek: true,
				lessonNumber: true,
				teacher: { select: { id: true, fullName: true } },
			},
		}),
		prisma.termGrade.findMany({
			where: { termId, subjectId },
			select: { studentId: true, value: true },
		}),
		prisma.yearGrade.findMany({
			where: { academicYearId: cls.academicYearId, subjectId },
			select: { studentId: true, value: true },
		}),
	]);

	// Замены недели: в журнале показываем фактического учителя.
	const substitutions =
		slots.length > 0
			? await prisma.substitution.findMany({
					where: {
						scheduleSlotId: { in: slots.map((slot) => slot.id) },
						date: { gte: from, lte: to },
					},
					select: {
						scheduleSlotId: true,
						date: true,
						substituteTeacher: { select: { id: true, fullName: true } },
					},
				})
			: [];
	const substituteByKey = new Map(
		substitutions.map((substitution) => [
			`${substitution.scheduleSlotId}|${formatDateInput(substitution.date)}`,
			substitution.substituteTeacher,
		]),
	);

	// Плановые уроки периода из расписания.
	type PlannedLesson = {
		slotId: number;
		date: Date;
		lessonNumber: number;
		teacher: { id: number; fullName: string };
	};
	const planned = new Map<string, PlannedLesson>();
	for (let day = from; day <= to; day = addDays(day, 1)) {
		const dayOfWeek = isoDayOfWeek(day);
		for (const slot of slots) {
			if (slot.dayOfWeek !== dayOfWeek) continue;
			const key = `${slot.id}|${formatDateInput(day)}`;
			planned.set(key, {
				slotId: slot.id,
				date: day,
				lessonNumber: slot.lessonNumber,
				teacher: substituteByKey.get(key) ?? slot.teacher,
			});
		}
	}

	// Средний за период — по всем оценкам уроков периода (уже выбраны выше).
	const termAverage = new Map<number, number>();
	{
		const byStudent = new Map<number, { value: number }[]>();
		for (const lesson of lessons) {
			for (const grade of lesson.grades) {
				const list = byStudent.get(grade.studentId) ?? [];
				list.push(grade);
				byStudent.set(grade.studentId, list);
			}
		}
		for (const [studentId, values] of byStudent) {
			termAverage.set(studentId, averageOf(values)!);
		}
	}
	const termGradeByStudent = new Map(termGradeRows.map((row) => [row.studentId, row.value]));
	const yearGradeByStudent = new Map(yearGradeRows.map((row) => [row.studentId, row.value]));

	// Фактические записи журнала «закрывают» свой слот расписания.
	const entries: GradeGridLesson[] = lessons.map((lesson) => {
		if (lesson.scheduleSlotId) {
			planned.delete(`${lesson.scheduleSlotId}|${formatDateInput(lesson.date)}`);
		}
		return {
			id: lesson.id,
			scheduleSlotId: lesson.scheduleSlotId,
			date: lesson.date,
			lessonNumber: lesson.scheduleSlot?.lessonNumber ?? null,
			topic: lesson.topic,
			homework: lesson.homework,
			teacher: lesson.teacher,
			averageGrade: averageOf(lesson.grades),
			grades: lesson.grades,
		};
	});
	for (const occurrence of planned.values()) {
		entries.push({
			id: null,
			scheduleSlotId: occurrence.slotId,
			date: occurrence.date,
			lessonNumber: occurrence.lessonNumber,
			topic: null,
			homework: null,
			teacher: occurrence.teacher,
			averageGrade: null,
			grades: [],
		});
	}
	entries.sort(
		(a, b) =>
			a.date.getTime() - b.date.getTime() ||
			(a.lessonNumber ?? 99) - (b.lessonNumber ?? 99) ||
			(a.id ?? 0) - (b.id ?? 0),
	);

	return {
		students: students.map((student) => ({
			...student,
			termAverage: termAverage.get(student.id) ?? null,
			termGrade: termGradeByStudent.get(student.id) ?? null,
			yearGrade: yearGradeByStudent.get(student.id) ?? null,
		})),
		lessons: entries,
	};
}

// Учебные периоды учебного года класса (для селекта периода в журнале).
export async function getClassTerms(classId: number) {
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		select: {
			academicYearId: true,
			academicYear: {
				select: {
					terms: {
						select: {
							id: true,
							type: true,
							number: true,
							startDate: true,
							endDate: true,
						},
						orderBy: { startDate: "asc" },
					},
				},
			},
		},
	});
	if (!cls) throw new ServiceError("Class not found", 404);
	return { academicYearId: cls.academicYearId, terms: cls.academicYear.terms };
}

export type StudentTermSubject = {
	subject: { id: number; name: string };
	// все оценки за период по датам уроков
	grades: { value: number; comment: string | null; date: Date }[];
	// итоговая за период и годовая, выставленные учителем
	termGrade: number | null;
	yearGrade: number | null;
};

// Сводка ученика за учебный период: по каждому предмету (из расписания
// периода и фактических уроков) — все оценки, итоговая за период и годовая.
export async function getStudentTermSummary(
	classId: number,
	studentId: number,
	termId: number,
): Promise<StudentTermSubject[]> {
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		select: { academicYearId: true },
	});
	if (!cls) return [];
	const term = await prisma.term.findUnique({ where: { id: termId } });
	if (!term || term.academicYearId !== cls.academicYearId) return [];

	const [grades, slotSubjects, lessonSubjects, termGradeRows, yearGradeRows] = await Promise.all([
		prisma.grade.findMany({
			where: {
				studentId,
				lesson: {
					classId,
					date: { gte: term.startDate, lte: term.endDate },
				},
			},
			select: {
				value: true,
				comment: true,
				lesson: {
					select: {
						date: true,
						subject: { select: { id: true, name: true } },
					},
				},
			},
			orderBy: [{ lesson: { date: "asc" } }, { id: "asc" }],
		}),
		prisma.scheduleSlot.findMany({
			where: { classId, termId },
			select: { subject: { select: { id: true, name: true } } },
			distinct: ["subjectId"],
		}),
		prisma.lesson.findMany({
			where: { classId, date: { gte: term.startDate, lte: term.endDate } },
			select: { subject: { select: { id: true, name: true } } },
			distinct: ["subjectId"],
		}),
		prisma.termGrade.findMany({
			where: { studentId, termId },
			select: { subjectId: true, value: true },
		}),
		prisma.yearGrade.findMany({
			where: { studentId, academicYearId: cls.academicYearId },
			select: { subjectId: true, value: true },
		}),
	]);

	const subjects = new Map<number, { id: number; name: string }>();
	for (const { subject } of [...slotSubjects, ...lessonSubjects]) {
		subjects.set(subject.id, subject);
	}
	const gradesBySubject = new Map<number, StudentTermSubject["grades"]>();
	for (const grade of grades) {
		subjects.set(grade.lesson.subject.id, grade.lesson.subject);
		const list = gradesBySubject.get(grade.lesson.subject.id) ?? [];
		list.push({ value: grade.value, comment: grade.comment, date: grade.lesson.date });
		gradesBySubject.set(grade.lesson.subject.id, list);
	}
	const termGradeBySubject = new Map(termGradeRows.map((row) => [row.subjectId, row.value]));
	const yearGradeBySubject = new Map(yearGradeRows.map((row) => [row.subjectId, row.value]));

	return [...subjects.values()]
		.sort((a, b) => a.name.localeCompare(b.name, "ru"))
		.map((subject) => ({
			subject,
			grades: gradesBySubject.get(subject.id) ?? [],
			termGrade: termGradeBySubject.get(subject.id) ?? null,
			yearGrade: yearGradeBySubject.get(subject.id) ?? null,
		}));
}

export type FinalGradeInput = {
	studentId?: number;
	value?: number;
};

function validateFinalGrades(grades: FinalGradeInput[]) {
	if (grades.length === 0) throw new ServiceError("grades array is required");
	for (const grade of grades) {
		if (!grade.studentId) throw new ServiceError("Each grade needs studentId");
		if (!Number.isInteger(grade.value) || grade.value! < 1 || grade.value! > 5) {
			throw new ServiceError("Each grade value must be an integer from 1 to 5");
		}
	}
}

async function ensureStudents(studentIds: number[]) {
	const students = await prisma.student.findMany({
		where: { id: { in: studentIds } },
		select: { id: true },
	});
	if (students.length !== new Set(studentIds).size) {
		throw new ServiceError("One or more students not found", 404);
	}
}

// Итоговые оценки за учебный период (upsert по ученик+предмет+период).
export async function setTermGrades(termId: number, subjectId: number, grades: FinalGradeInput[]) {
	validateFinalGrades(grades);
	const term = await prisma.term.findUnique({ where: { id: termId }, select: { id: true } });
	if (!term) throw new ServiceError("Term not found", 404);
	const subject = await prisma.subject.findUnique({
		where: { id: subjectId },
		select: { id: true },
	});
	if (!subject) throw new ServiceError("Subject not found", 404);
	await ensureStudents(grades.map((grade) => grade.studentId!));

	return prisma.$transaction(
		grades.map((grade) =>
			prisma.termGrade.upsert({
				where: {
					studentId_subjectId_termId: {
						studentId: grade.studentId!,
						subjectId,
						termId,
					},
				},
				create: { studentId: grade.studentId!, subjectId, termId, value: grade.value! },
				update: { value: grade.value! },
			}),
		),
	);
}

// Годовые («итоговые») оценки (upsert по ученик+предмет+учебный год).
export async function setYearGrades(
	academicYearId: number,
	subjectId: number,
	grades: FinalGradeInput[],
) {
	validateFinalGrades(grades);
	const year = await prisma.academicYear.findUnique({
		where: { id: academicYearId },
		select: { id: true },
	});
	if (!year) throw new ServiceError("Academic year not found", 404);
	const subject = await prisma.subject.findUnique({
		where: { id: subjectId },
		select: { id: true },
	});
	if (!subject) throw new ServiceError("Subject not found", 404);
	await ensureStudents(grades.map((grade) => grade.studentId!));

	return prisma.$transaction(
		grades.map((grade) =>
			prisma.yearGrade.upsert({
				where: {
					studentId_subjectId_academicYearId: {
						studentId: grade.studentId!,
						subjectId,
						academicYearId,
					},
				},
				create: {
					studentId: grade.studentId!,
					subjectId,
					academicYearId,
					value: grade.value!,
				},
				update: { value: grade.value! },
			}),
		),
	);
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
