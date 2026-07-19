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

export type UpdateStudentInput = {
	fullName?: string;
	birthDate?: string | Date | null;
	classId?: number | null;
	isActive?: boolean;
};

export async function updateStudent(id: number, input: UpdateStudentInput) {
	const existing = await prisma.student.findUnique({ where: { id } });
	if (!existing) throw new ServiceError("Student not found", 404);

	if (input.fullName !== undefined && !input.fullName.trim()) {
		throw new ServiceError("fullName cannot be empty");
	}

	let birthDate: Date | null | undefined;
	if (input.birthDate !== undefined) {
		birthDate = input.birthDate === null ? null : parseDate(input.birthDate);
		if (input.birthDate !== null && !birthDate) {
			throw new ServiceError("birthDate must be a valid date (YYYY-MM-DD)");
		}
	}

	if (input.classId != null) {
		const cls = await prisma.class.findUnique({ where: { id: input.classId } });
		if (!cls) throw new ServiceError(`Class ${input.classId} not found`, 404);
	}

	return prisma.student.update({
		where: { id },
		data: {
			...(input.fullName !== undefined
				? { fullName: input.fullName.trim() }
				: {}),
			...(input.birthDate !== undefined ? { birthDate } : {}),
			...(input.classId !== undefined ? { classId: input.classId } : {}),
			...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
		},
	});
}

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
