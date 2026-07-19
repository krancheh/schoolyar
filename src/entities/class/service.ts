import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError } from "@shared/lib/api";

export function listClasses(filters: { academicYearId?: number } = {}) {
	return prisma.class.findMany({
		where: filters.academicYearId
			? { academicYearId: filters.academicYearId }
			: undefined,
		include: {
			academicYear: { select: { id: true, name: true } },
			homeroomTeacher: { select: { id: true, fullName: true } },
			_count: { select: { students: true } },
		},
		orderBy: { name: "asc" },
	});
}

// Класс с руководителем, годом и списком активных учеников («Мой класс»).
export async function getClass(classId: number) {
	const cls = await prisma.class.findUnique({
		where: { id: classId },
		include: {
			academicYear: { select: { id: true, name: true } },
			homeroomTeacher: { select: { id: true, fullName: true } },
			students: {
				where: { isActive: true },
				orderBy: { fullName: "asc" },
				select: { id: true, fullName: true, birthDate: true },
			},
		},
	});
	if (!cls) throw new ServiceError(`Class ${classId} not found`, 404);
	return cls;
}

export type CreateClassInput = {
	name?: string;
	academicYearId?: number;
	homeroomTeacherId?: number;
};

export type UpdateClassInput = {
	name?: string;
	homeroomTeacherId?: number | null;
};

export async function updateClass(id: number, input: UpdateClassInput) {
	const existing = await prisma.class.findUnique({ where: { id } });
	if (!existing) throw new ServiceError("Class not found", 404);

	if (input.name !== undefined && !input.name.trim()) {
		throw new ServiceError("name cannot be empty");
	}
	if (input.homeroomTeacherId != null) {
		const teacher = await prisma.employee.findUnique({
			where: { id: input.homeroomTeacherId },
		});
		if (!teacher) {
			throw new ServiceError(
				`Employee ${input.homeroomTeacherId} not found`,
				404
			);
		}
	}

	try {
		return await prisma.class.update({
			where: { id },
			data: {
				...(input.name !== undefined ? { name: input.name.trim() } : {}),
				...(input.homeroomTeacherId !== undefined
					? { homeroomTeacherId: input.homeroomTeacherId }
					: {}),
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError(
				"Class with this name already exists in this academic year",
				409
			);
		}
		throw error;
	}
}

export async function createClass(input: CreateClassInput) {
	if (!input.name?.trim()) throw new ServiceError("name is required");
	if (!input.academicYearId) {
		throw new ServiceError("academicYearId is required");
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
		return await prisma.class.create({
			data: {
				name: input.name.trim(),
				academicYearId: input.academicYearId,
				homeroomTeacherId: input.homeroomTeacherId,
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError(
				"Class with this name already exists in this academic year",
				409
			);
		}
		throw error;
	}
}
