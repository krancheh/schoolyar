import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError } from "@shared/lib/api";

// "HH:MM", 00:00–23:59; строки такого вида корректно сравниваются лексикографически.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function listBells() {
	return prisma.bellSchedule.findMany({ orderBy: { lessonNumber: "asc" } });
}

export type CreateBellInput = {
	lessonNumber?: number;
	startTime?: string;
	endTime?: string;
};

export type UpdateBellInput = {
	lessonNumber?: number;
	startTime?: string;
	endTime?: string;
};

function validateTimes(startTime: string, endTime: string) {
	if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
		throw new ServiceError("startTime and endTime must be in HH:MM format");
	}
	if (endTime <= startTime) {
		throw new ServiceError("endTime must be after startTime");
	}
}

export async function createBell(input: CreateBellInput) {
	if (
		!input.lessonNumber ||
		!Number.isInteger(input.lessonNumber) ||
		input.lessonNumber < 1
	) {
		throw new ServiceError("lessonNumber must be a positive integer");
	}
	if (!input.startTime || !input.endTime) {
		throw new ServiceError("startTime and endTime are required");
	}
	validateTimes(input.startTime, input.endTime);

	try {
		return await prisma.bellSchedule.create({
			data: {
				lessonNumber: input.lessonNumber,
				startTime: input.startTime,
				endTime: input.endTime,
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError("Bell for this lesson number already exists", 409);
		}
		throw error;
	}
}

export async function updateBell(id: number, input: UpdateBellInput) {
	const existing = await prisma.bellSchedule.findUnique({ where: { id } });
	if (!existing) throw new ServiceError("Bell not found", 404);

	if (
		input.lessonNumber !== undefined &&
		(!Number.isInteger(input.lessonNumber) || input.lessonNumber < 1)
	) {
		throw new ServiceError("lessonNumber must be a positive integer");
	}
	validateTimes(
		input.startTime ?? existing.startTime,
		input.endTime ?? existing.endTime
	);

	try {
		return await prisma.bellSchedule.update({
			where: { id },
			data: {
				...(input.lessonNumber !== undefined
					? { lessonNumber: input.lessonNumber }
					: {}),
				...(input.startTime !== undefined
					? { startTime: input.startTime }
					: {}),
				...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError("Bell for this lesson number already exists", 409);
		}
		throw error;
	}
}
