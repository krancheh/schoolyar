import { prisma } from "@shared/lib/db";
import { ServiceError, parseDate } from "@shared/lib/api";

export function listStudents(filters: { classId?: number } = {}) {
	return prisma.student.findMany({
		where: filters.classId ? { classId: filters.classId } : undefined,
		include: { class: { select: { id: true, name: true } } },
		orderBy: { fullName: "asc" },
	});
}

export type CreateStudentInput = {
	fullName?: string;
	birthDate?: string | Date;
	classId?: number;
};

export async function createStudent(input: CreateStudentInput) {
	if (!input.fullName?.trim()) {
		throw new ServiceError("fullName is required");
	}

	const birthDate = parseDate(input.birthDate);
	if (input.birthDate && !birthDate) {
		throw new ServiceError("birthDate must be a valid date (YYYY-MM-DD)");
	}

	if (input.classId != null) {
		const cls = await prisma.class.findUnique({ where: { id: input.classId } });
		if (!cls) throw new ServiceError(`Class ${input.classId} not found`, 404);
	}

	return prisma.student.create({
		data: {
			fullName: input.fullName.trim(),
			birthDate,
			classId: input.classId,
		},
	});
}
