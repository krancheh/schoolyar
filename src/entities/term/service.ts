import { Prisma, TermType } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError, parseDate } from "@shared/lib/api";

export function listTerms(filters: { academicYearId?: number } = {}) {
	return prisma.term.findMany({
		where: filters.academicYearId
			? { academicYearId: filters.academicYearId }
			: undefined,
		include: { academicYear: { select: { id: true, name: true } } },
		orderBy: [{ academicYearId: "desc" }, { number: "asc" }],
	});
}

export type CreateTermInput = {
	academicYearId?: number;
	type?: TermType;
	number?: number;
	startDate?: string | Date;
	endDate?: string | Date;
};

export async function createTerm(input: CreateTermInput) {
	if (!input.academicYearId) {
		throw new ServiceError("academicYearId is required");
	}
	if (!input.number || input.number < 1) {
		throw new ServiceError("number must be a positive integer");
	}
	if (input.type && !Object.values(TermType).includes(input.type)) {
		throw new ServiceError(
			`type must be one of: ${Object.values(TermType).join(", ")}`
		);
	}

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

	const year = await prisma.academicYear.findUnique({
		where: { id: input.academicYearId },
	});
	if (!year) {
		throw new ServiceError(
			`AcademicYear ${input.academicYearId} not found`,
			404
		);
	}

	try {
		return await prisma.term.create({
			data: {
				academicYearId: input.academicYearId,
				type: input.type,
				number: input.number,
				startDate,
				endDate,
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError(
				"Term with this type and number already exists in this academic year",
				409
			);
		}
		throw error;
	}
}
