import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, parseDate } from "@shared/lib/api";

export function listAcademicYears() {
	return prisma.academicYear.findMany({
		include: { terms: { orderBy: { number: "asc" } } },
		orderBy: { startDate: "desc" },
	});
}

export type CreateAcademicYearInput = {
	name?: string;
	startDate?: string | Date;
	endDate?: string | Date;
};

export async function createAcademicYear(input: CreateAcademicYearInput) {
	if (!input.name?.trim()) throw new ServiceError("name is required");

	const startDate = parseDate(input.startDate);
	const endDate = parseDate(input.endDate);
	if (!startDate || !endDate) {
		throw new ServiceError(
			"startDate and endDate must be valid dates (YYYY-MM-DD)"
		);
	}
	if (endDate <= startDate) {
		throw new ServiceError("endDate must be after startDate");
	}

	try {
		return await prisma.academicYear.create({
			data: { name: input.name.trim(), startDate, endDate },
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError(
				"Academic year with this name already exists",
				409
			);
		}
		throw error;
	}
}
