import { NextResponse } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseDate, parseId } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";

// Отчёт по посещаемости класса за период.
export async function GET(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

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
					? Math.round(
							((row.breakdown.PRESENT + row.breakdown.LATE) /
								row.totalMarked) *
								1000
						) / 10
					: null,
		}))
		.sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

	return NextResponse.json({
		class: { id: cls.id, name: cls.name },
		period: { from, to },
		students,
	});
}
