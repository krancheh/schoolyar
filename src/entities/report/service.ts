import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, eachDay, isoDayOfWeek } from "@shared/lib/api";

const round1 = (value: number) => Math.round(value * 1000) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

async function classWithStudents(classId: number) {
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		include: { students: { where: { isActive: true } } },
	});
	if (!cls) throw new ServiceError(`Class ${classId} not found`, 404);
	return cls;
}

// Посещаемость класса за период: разбивка по статусам на ученика.
export async function attendanceReport(
	classId: number,
	period: { from?: Date; to?: Date } = {}
) {
	const { from, to } = period;
	const cls = await classWithStudents(classId);

	const records = await prisma.attendance.findMany({
		where: {
			lesson: {
				classId,
				...(from || to
					? {
							date: {
								...(from ? { gte: from } : {}),
								...(to ? { lte: to } : {}),
							},
						}
					: {}),
			},
		},
		select: { studentId: true, status: true },
	});

	const emptyBreakdown = () =>
		Object.fromEntries(
			Object.values(AttendanceStatus).map((status) => [status, 0])
		) as Record<AttendanceStatus, number>;

	const byStudent = new Map(
		cls.students.map((student) => [
			student.id,
			{
				studentId: student.id,
				fullName: student.fullName,
				totalMarked: 0,
				breakdown: emptyBreakdown(),
			},
		])
	);

	for (const record of records) {
		const row = byStudent.get(record.studentId);
		if (!row) continue;
		row.totalMarked += 1;
		row.breakdown[record.status] += 1;
	}

	const students = [...byStudent.values()]
		.map((row) => ({
			...row,
			attendancePercent:
				row.totalMarked > 0
					? round1(
							(row.breakdown.PRESENT + row.breakdown.LATE) / row.totalMarked
						)
					: null,
		}))
		.sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

	return {
		class: { id: cls.id, name: cls.name },
		period: { from: from ?? null, to: to ?? null },
		students,
	};
}

// Успеваемость: средний балл по предметам и общий, по ученикам класса.
export async function performanceReport(
	classId: number,
	period: { from?: Date; to?: Date } = {}
) {
	const { from, to } = period;
	const cls = await classWithStudents(classId);

	const grades = await prisma.grade.findMany({
		where: {
			lesson: {
				classId,
				...(from || to
					? {
							date: {
								...(from ? { gte: from } : {}),
								...(to ? { lte: to } : {}),
							},
						}
					: {}),
			},
		},
		select: {
			studentId: true,
			value: true,
			lesson: { select: { subject: { select: { id: true, name: true } } } },
		},
	});

	type SubjectStats = { subjectName: string; sum: number; count: number };
	const byStudent = new Map<number, Map<number, SubjectStats>>();

	for (const grade of grades) {
		let subjects = byStudent.get(grade.studentId);
		if (!subjects) {
			subjects = new Map();
			byStudent.set(grade.studentId, subjects);
		}
		const subject = grade.lesson.subject;
		let stats = subjects.get(subject.id);
		if (!stats) {
			stats = { subjectName: subject.name, sum: 0, count: 0 };
			subjects.set(subject.id, stats);
		}
		stats.sum += grade.value;
		stats.count += 1;
	}

	const students = cls.students
		.map((student) => {
			const subjects = byStudent.get(student.id) ?? new Map();
			let totalSum = 0;
			let totalCount = 0;
			const bySubject = [...subjects.entries()].map(
				([subjectId, stats]: [number, SubjectStats]) => {
					totalSum += stats.sum;
					totalCount += stats.count;
					return {
						subjectId,
						subjectName: stats.subjectName,
						averageGrade: round2(stats.sum / stats.count),
						gradesCount: stats.count,
					};
				}
			);

			return {
				studentId: student.id,
				fullName: student.fullName,
				overallAverage: totalCount > 0 ? round2(totalSum / totalCount) : null,
				gradesCount: totalCount,
				bySubject,
			};
		})
		.sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

	return {
		class: { id: cls.id, name: cls.name },
		period: { from: from ?? null, to: to ?? null },
		students,
	};
}

// Заполнение журнала: сколько уроков по расписанию должно было пройти
// за период и сколько из них записано с темой и д/з.
export async function journalCompletionReport(
	termId: number,
	filters: { classId?: number } = {}
) {
	const { classId } = filters;

	const term = await prisma.term.findUnique({ where: { id: termId } });
	if (!term) throw new ServiceError(`Term ${termId} not found`, 404);

	const slots = await prisma.scheduleSlot.findMany({
		where: { termId, ...(classId ? { classId } : {}) },
		include: {
			class: { select: { id: true, name: true } },
			subject: { select: { id: true, name: true } },
			teacher: { select: { id: true, fullName: true } },
		},
	});

	// Отчёт считается только по прошедшим дням.
	const today = new Date();
	const rangeEnd = term.endDate < today ? term.endDate : today;

	// Ожидаемое число уроков: дни периода × подходящий день недели.
	const expectedBySlot = new Map<number, number>();
	if (term.startDate <= rangeEnd) {
		for (const date of eachDay(term.startDate, rangeEnd)) {
			const dayOfWeek = isoDayOfWeek(date);
			for (const slot of slots) {
				if (slot.dayOfWeek === dayOfWeek) {
					expectedBySlot.set(slot.id, (expectedBySlot.get(slot.id) ?? 0) + 1);
				}
			}
		}
	}

	const lessons = await prisma.lesson.findMany({
		where: {
			date: { gte: term.startDate, lte: rangeEnd },
			...(classId ? { classId } : {}),
		},
		select: {
			classId: true,
			subjectId: true,
			teacherId: true,
			topic: true,
			homework: true,
		},
	});

	type LessonFacts = { total: number; withTopic: number; withHomework: number };
	const lessonsByKey = new Map<string, LessonFacts>();
	for (const lesson of lessons) {
		const key = `${lesson.classId}:${lesson.subjectId}`;
		let facts = lessonsByKey.get(key);
		if (!facts) {
			facts = { total: 0, withTopic: 0, withHomework: 0 };
			lessonsByKey.set(key, facts);
		}
		facts.total += 1;
		if (lesson.topic?.trim()) facts.withTopic += 1;
		if (lesson.homework?.trim()) facts.withHomework += 1;
	}

	// Группировка по классу+предмету (учитель — из расписания).
	type Row = {
		class: { id: number; name: string };
		subject: { id: number; name: string };
		teacher: { id: number; fullName: string };
		expectedLessons: number;
	};
	const rowsByKey = new Map<string, Row>();
	for (const slot of slots) {
		const key = `${slot.classId}:${slot.subjectId}`;
		const row = rowsByKey.get(key);
		if (row) {
			row.expectedLessons += expectedBySlot.get(slot.id) ?? 0;
		} else {
			rowsByKey.set(key, {
				class: slot.class,
				subject: slot.subject,
				teacher: slot.teacher,
				expectedLessons: expectedBySlot.get(slot.id) ?? 0,
			});
		}
	}

	const rows = [...rowsByKey.entries()]
		.map(([key, row]) => {
			const facts = lessonsByKey.get(key) ?? {
				total: 0,
				withTopic: 0,
				withHomework: 0,
			};
			return {
				...row,
				recordedLessons: facts.total,
				withTopic: facts.withTopic,
				withHomework: facts.withHomework,
				completionPercent:
					row.expectedLessons > 0
						? round1(facts.withTopic / row.expectedLessons)
						: null,
			};
		})
		.sort(
			(a, b) =>
				a.class.name.localeCompare(b.class.name, "ru") ||
				a.subject.name.localeCompare(b.subject.name, "ru")
		);

	return {
		term: {
			id: term.id,
			type: term.type,
			number: term.number,
			startDate: term.startDate,
			endDate: term.endDate,
		},
		countedUntil: rangeEnd,
		rows,
	};
}
