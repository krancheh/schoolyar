import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { jsonError, parseDate, parseId } from "@shared/lib/api";

// Отчёт по успеваемости: средний балл по предметам и общий, по ученикам класса.
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const classId = parseId(searchParams.get("classId"));
	const from = parseDate(searchParams.get("from"));
	const to = parseDate(searchParams.get("to"));

	if (!classId) return jsonError("classId query parameter is required");

	const cls = await prisma.class.findUnique({
		where: { id: classId },
		include: { students: { where: { isActive: true } } },
	});
	if (!cls) return jsonError(`Class ${classId} not found`, 404);

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

	const round = (value: number) => Math.round(value * 100) / 100;

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
						averageGrade: round(stats.sum / stats.count),
						gradesCount: stats.count,
					};
				}
			);

			return {
				studentId: student.id,
				fullName: student.fullName,
				overallAverage: totalCount > 0 ? round(totalSum / totalCount) : null,
				gradesCount: totalCount,
				bySubject,
			};
		})
		.sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

	return NextResponse.json({
		class: { id: cls.id, name: cls.name },
		period: { from, to },
		students,
	});
}
