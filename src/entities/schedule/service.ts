import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, isoDayOfWeek } from "@shared/lib/api";

const slotInclude = {
	class: { select: { id: true, name: true } },
	subject: { select: { id: true, name: true } },
	teacher: { select: { id: true, fullName: true } },
	term: { select: { id: true, type: true, number: true } },
} satisfies Prisma.ScheduleSlotInclude;

export function listScheduleSlots(
	filters: { classId?: number; termId?: number; teacherId?: number } = {}
) {
	return prisma.scheduleSlot.findMany({
		where: {
			...(filters.classId ? { classId: filters.classId } : {}),
			...(filters.termId ? { termId: filters.termId } : {}),
			...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
		},
		include: slotInclude,
		orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
	});
}

type DayScheduleSlot = Prisma.ScheduleSlotGetPayload<{
	include: typeof slotInclude;
}>;

export type DayScheduleEntry = {
	slot: DayScheduleSlot;
	substitution: {
		id: number;
		substituteTeacher: { id: number; fullName: string };
		reason: string | null;
	} | null;
};

// Фактическое расписание на конкретную дату: слоты активных на эту дату
// периодов с наложенными заменами этого дня.
export async function getDaySchedule(
	date: Date,
	filters: { classId?: number } = {}
): Promise<{ inTerm: boolean; entries: DayScheduleEntry[] }> {
	const terms = await prisma.term.findMany({
		where: { startDate: { lte: date }, endDate: { gte: date } },
		select: { id: true },
	});
	if (terms.length === 0) return { inTerm: false, entries: [] };

	const slots = await prisma.scheduleSlot.findMany({
		where: {
			termId: { in: terms.map((term) => term.id) },
			dayOfWeek: isoDayOfWeek(date),
			...(filters.classId ? { classId: filters.classId } : {}),
		},
		include: slotInclude,
		orderBy: [{ class: { name: "asc" } }, { lessonNumber: "asc" }],
	});
	if (slots.length === 0) return { inTerm: true, entries: [] };

	const substitutions = await prisma.substitution.findMany({
		where: { date, scheduleSlotId: { in: slots.map((slot) => slot.id) } },
		select: {
			id: true,
			scheduleSlotId: true,
			reason: true,
			substituteTeacher: { select: { id: true, fullName: true } },
		},
	});
	const bySlotId = new Map(
		substitutions.map((substitution) => [substitution.scheduleSlotId, substitution])
	);

	return {
		inTerm: true,
		entries: slots.map((slot) => {
			const substitution = bySlotId.get(slot.id);
			return {
				slot,
				substitution: substitution
					? {
							id: substitution.id,
							substituteTeacher: substitution.substituteTeacher,
							reason: substitution.reason,
						}
					: null,
			};
		}),
	};
}

export type CreateScheduleSlotInput = {
	termId?: number;
	classId?: number;
	subjectId?: number;
	teacherId?: number;
	dayOfWeek?: number;
	lessonNumber?: number;
	room?: string;
};

export type UpdateScheduleSlotInput = {
	termId?: number;
	classId?: number;
	subjectId?: number;
	teacherId?: number;
	dayOfWeek?: number;
	lessonNumber?: number;
	room?: string | null;
};

export async function updateScheduleSlot(
	id: number,
	input: UpdateScheduleSlotInput
) {
	const existing = await prisma.scheduleSlot.findUnique({ where: { id } });
	if (!existing) throw new ServiceError("Schedule slot not found", 404);

	if (
		input.dayOfWeek !== undefined &&
		(input.dayOfWeek < 1 || input.dayOfWeek > 7)
	) {
		throw new ServiceError(
			"dayOfWeek must be between 1 (Monday) and 7 (Sunday)"
		);
	}
	if (input.lessonNumber !== undefined && input.lessonNumber < 1) {
		throw new ServiceError("lessonNumber must be a positive integer");
	}

	try {
		return await prisma.scheduleSlot.update({
			where: { id },
			data: {
				...(input.termId !== undefined ? { termId: input.termId } : {}),
				...(input.classId !== undefined ? { classId: input.classId } : {}),
				...(input.subjectId !== undefined
					? { subjectId: input.subjectId }
					: {}),
				...(input.teacherId !== undefined
					? { teacherId: input.teacherId }
					: {}),
				...(input.dayOfWeek !== undefined
					? { dayOfWeek: input.dayOfWeek }
					: {}),
				...(input.lessonNumber !== undefined
					? { lessonNumber: input.lessonNumber }
					: {}),
				...(input.room !== undefined ? { room: input.room || null } : {}),
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				throw new ServiceError(
					"This class already has a lesson at this time in this term",
					409
				);
			}
			if (error.code === "P2003") {
				throw new ServiceError(
					"Related term, class, subject or teacher not found",
					404
				);
			}
		}
		throw error;
	}
}

export async function createScheduleSlot(input: CreateScheduleSlotInput) {
	if (
		!input.termId ||
		!input.classId ||
		!input.subjectId ||
		!input.teacherId ||
		!input.dayOfWeek ||
		!input.lessonNumber
	) {
		throw new ServiceError(
			"termId, classId, subjectId, teacherId, dayOfWeek and lessonNumber are required"
		);
	}

	if (input.dayOfWeek < 1 || input.dayOfWeek > 7) {
		throw new ServiceError(
			"dayOfWeek must be between 1 (Monday) and 7 (Sunday)"
		);
	}
	if (input.lessonNumber < 1) {
		throw new ServiceError("lessonNumber must be a positive integer");
	}

	try {
		return await prisma.scheduleSlot.create({
			data: {
				termId: input.termId,
				classId: input.classId,
				subjectId: input.subjectId,
				teacherId: input.teacherId,
				dayOfWeek: input.dayOfWeek,
				lessonNumber: input.lessonNumber,
				room: input.room,
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				throw new ServiceError(
					"This class already has a lesson at this time in this term",
					409
				);
			}
			if (error.code === "P2003") {
				throw new ServiceError(
					"Related term, class, subject or teacher not found",
					404
				);
			}
		}
		throw error;
	}
}
