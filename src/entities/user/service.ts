import { prisma } from "@shared/lib/db";
import { ServiceError, toDeleteError } from "@shared/lib/api";

// Список последних учёток; хэши паролей наружу не отдаём.
export function listUsers(limit = 10) {
	return prisma.user.findMany({
		take: limit,
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			fullName: true,
			login: true,
			employeeId: true,
			studentId: true,
			createdAt: true,
			employee: { select: { fullName: true, role: true } },
			student: { select: { fullName: true } },
		},
	});
}

// Удаление учётки: сессии уходят каскадом, сотрудник/ученик остаются.
export async function deleteUser(id: number, actorId: number) {
	if (id === actorId) {
		throw new ServiceError("You cannot delete your own account", 409);
	}
	try {
		await prisma.user.delete({ where: { id } });
	} catch (error) {
		throw toDeleteError(error, "User not found");
	}
}
