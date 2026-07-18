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
