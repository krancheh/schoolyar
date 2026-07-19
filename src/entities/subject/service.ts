import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError } from "@shared/lib/api";

export function listSubjects() {
	return prisma.subject.findMany({ orderBy: { name: "asc" } });
}

export async function updateSubject(id: number, input: { name?: string }) {
	const existing = await prisma.subject.findUnique({ where: { id } });
	if (!existing) throw new ServiceError("Subject not found", 404);
	if (!input.name?.trim()) throw new ServiceError("name cannot be empty");

	try {
		return await prisma.subject.update({
			where: { id },
			data: { name: input.name.trim() },
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError("Subject with this name already exists", 409);
		}
		throw error;
	}
}

export async function createSubject(input: { name?: string }) {
	if (!input.name?.trim()) throw new ServiceError("name is required");

	try {
		return await prisma.subject.create({ data: { name: input.name.trim() } });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ServiceError("Subject with this name already exists", 409);
		}
		throw error;
	}
}
