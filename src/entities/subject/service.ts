import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { ServiceError } from "@shared/lib/api";

export function listSubjects() {
	return prisma.subject.findMany({ orderBy: { name: "asc" } });
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
