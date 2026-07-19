import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, isoDayOfWeek, parseDate } from "@shared/lib/api";

export function listSubstitutions(
	filters: { from?: Date; to?: Date; teacherId?: number } = {}
) {
	const { from, to, teacherId } = filters;

	return prisma.substitution.findMany({
		where: {
			...(from || to
				? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
				: {}),
			...(teacherId ? { substituteTeacherId: teacherId } : {}),
		},
		include: {
			substituteTeacher: { select: { id: true, fullName: true } },
			scheduleSlot: {
				include: {
					class: { select: { id: true, name: true } },
					subject: { select: { id: true, name: true } },
					teacher: { select: { id: true, fullName: true } },
				},
			},
		},
		orderBy: { date: "asc" },
	});
}

export type CreateSubstitutionInput = {
	scheduleSlotId?: number;
	date?: string | Date;
	substituteTeacherId?: number;
	reason?: string;
};

export type UpdateSubstitutionInput = {
	date?: string | Date;
	substituteTeacherId?: number;
	reason?: string | null;
};

export async function updateSubstitution(
	id: number,
	input: UpdateSubstitutionInput
) {
	const existing = await prisma.substitution.findUnique({
		where: { id },
		include: { scheduleSlot: true },
	});
	if (!existing) throw new ServiceError("Substitution not found", 404);

	let date: Date | undefined;
	if (input.date !== undefined) {
		const parsed = parseDate(input.date);
		if (!parsed) {
			throw new ServiceError("date must be a valid date (YYYY-MM-DD)");
		}
		if (isoDayOfWeek(parsed) !== existing.scheduleSlot.dayOfWeek) {
			throw new ServiceError(
				`Date does not match the slot's day of week (${existing.scheduleSlot.dayOfWeek})`
			);
		}
		date = parsed;
	}

	const substituteTeacherId =
		input.substituteTeacherId ?? existing.substituteTeacherId;
	if (substituteTeacherId === existing.scheduleSlot.teacherId) {
		throw new ServiceError(
			"Substitute teacher is the same as the scheduled teacher"
		);
	}

	try {
		return await prisma.substitution.update({
			where: { id },
			data: {
				...(date ? { date } : {}),
				...(input.substituteTeacherId !== undefined
					? { substituteTeacherId: input.substituteTeacherId }
					: {}),
				...(input.reason !== undefined
					? { reason: input.reason || null }
					: {}),
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				throw new ServiceError(
					"Substitution for this slot and date already exists",
					409
				);
			}
			if (error.code === "P2003") {
				throw new ServiceError("Substitute teacher not found", 404);
			}
		}
		throw error;
	}
}

export async function createSubstitution(input: CreateSubstitutionInput) {
	if (!input.scheduleSlotId || !input.substituteTeacherId) {
		throw new ServiceError(
			"scheduleSlotId and substituteTeacherId are required"
		);
	}

	const date = parseDate(input.date);
	if (!date) throw new ServiceError("date must be a valid date (YYYY-MM-DD)");

	const slot = await prisma.scheduleSlot.findUnique({
		where: { id: input.scheduleSlotId },
	});
	if (!slot) {
		throw new ServiceError(
			`ScheduleSlot ${input.scheduleSlotId} not found`,
			404
		);
	}
	if (isoDayOfWeek(date) !== slot.dayOfWeek) {
		throw new ServiceError(
			`Date does not match the slot's day of week (${slot.dayOfWeek})`
		);
	}
	if (slot.teacherId === input.substituteTeacherId) {
		throw new ServiceError(
			"Substitute teacher is the same as the scheduled teacher"
		);
	}

	try {
		return await prisma.substitution.create({
			data: {
				scheduleSlotId: input.scheduleSlotId,
				date,
				substituteTeacherId: input.substituteTeacherId,
				reason: input.reason,
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				throw new ServiceError(
					"Substitution for this slot and date already exists",
					409
				);
			}
			if (error.code === "P2003") {
				throw new ServiceError("Substitute teacher not found", 404);
			}
		}
		throw error;
	}
}
