import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { eachDay, isoDayOfWeek, jsonError, parseId } from "@shared/lib/api";

// Отчёт по заполнению журнала: сколько уроков по расписанию должно было
// пройти за период и сколько из них записано в журнал с темой и д/з.
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const termId = parseId(searchParams.get("termId"));
	const classId = parseId(searchParams.get("classId"));

	if (!termId) return jsonError("termId query parameter is required");

	const term = await prisma.term.findUnique({ where: { id: termId } });
	if (!term) return jsonError(`Term ${termId} not found`, 404);

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
						? Math.round((facts.withTopic / row.expectedLessons) * 1000) / 10
						: null,
			};
		})
		.sort(
			(a, b) =>
				a.class.name.localeCompare(b.class.name, "ru") ||
				a.subject.name.localeCompare(b.subject.name, "ru")
		);

	return NextResponse.json({
		term: {
			id: term.id,
			type: term.type,
			number: term.number,
			startDate: term.startDate,
			endDate: term.endDate,
		},
		countedUntil: rangeEnd,
		rows,
	});
}
