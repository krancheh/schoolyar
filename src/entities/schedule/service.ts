import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError } from "@shared/lib/api";

export function listScheduleSlots(
	filters: { classId?: number; termId?: number; teacherId?: number } = {}
) {
	return prisma.scheduleSlot.findMany({
		where: {
			...(filters.classId ? { classId: filters.classId } : {}),
			...(filters.termId ? { termId: filters.termId } : {}),
			...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
		},
		include: {
			class: { select: { id: true, name: true } },
			subject: { select: { id: true, name: true } },
			teacher: { select: { id: true, fullName: true } },
			term: { select: { id: true, type: true, number: true } },
		},
		orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
	});
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
