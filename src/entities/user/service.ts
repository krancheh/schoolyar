import { prisma } from "@shared/lib/db";

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
		},
	});
}
