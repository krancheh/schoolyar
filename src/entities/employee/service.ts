import { EmployeeRole, Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError } from "@shared/lib/api";

export function listEmployees() {
	return prisma.employee.findMany({ orderBy: { fullName: "asc" } });
}

export type CreateEmployeeInput = {
	fullName?: string;
	role?: EmployeeRole;
	email?: string;
	phone?: string;
};

export type UpdateEmployeeInput = {
	fullName?: string;
	role?: EmployeeRole;
	email?: string | null;
	phone?: string | null;
	isActive?: boolean;
};

// undefined — поле не трогаем, null — очищаем (для nullable-полей).
export async function updateEmployee(id: number, input: UpdateEmployeeInput) {
	const existing = await prisma.employee.findUnique({ where: { id } });
	if (!existing) throw new ServiceError("Employee not found", 404);

	if (input.fullName !== undefined && !input.fullName.trim()) {
		throw new ServiceError("fullName cannot be empty");
	}
	if (input.role && !Object.values(EmployeeRole).includes(input.role)) {
		throw new ServiceError(
			`role must be one of: ${Object.values(EmployeeRole).join(", ")}`
		);
	}

	try {
		return await prisma.employee.update({
			where: { id },
			data: {
				...(input.fullName !== undefined
					? { fullName: input.fullName.trim() }
					: {}),
				...(input.role !== undefined ? { role: input.role } : {}),
				...(input.email !== undefined ? { email: input.email || null } : {}),
				...(input.phone !== undefined ? { phone: input.phone || null } : {}),
				...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError("Employee with this email already exists", 409);
		}
		throw error;
	}
}

export async function createEmployee(input: CreateEmployeeInput) {
	if (!input.fullName?.trim()) {
		throw new ServiceError("fullName is required");
	}
	if (input.role && !Object.values(EmployeeRole).includes(input.role)) {
		throw new ServiceError(
			`role must be one of: ${Object.values(EmployeeRole).join(", ")}`
		);
	}

	try {
		return await prisma.employee.create({
			data: {
				fullName: input.fullName.trim(),
				role: input.role,
				email: input.email,
				phone: input.phone,
			},
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError("Employee with this email already exists", 409);
		}
		throw error;
	}
}
