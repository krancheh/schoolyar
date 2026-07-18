import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";
import { createSession, verifyPassword } from "@shared/lib/auth";

type LoginBody = {
	login?: string;
	password?: string;
};

export async function POST(request: Request) {
	const body = await parseBody<LoginBody>(request);
	if (!body?.login?.trim() || !body.password) {
		return jsonError("login and password are required");
	}

	const user = await prisma.user.findUnique({
		where: { login: body.login.trim() },
		include: {
			employee: { select: { id: true, fullName: true, role: true, isActive: true } },
			student: { select: { id: true, fullName: true, classId: true, isActive: true } },
		},
	});

	// Один и тот же ответ для «нет пользователя» и «неверный пароль»,
	// чтобы не раскрывать существование логинов.
	if (!user || !verifyPassword(body.password, user.passwordHash)) {
		return jsonError("Invalid login or password", 401);
	}

	if (user.employee?.isActive === false || user.student?.isActive === false) {
		return jsonError("Account is deactivated", 403);
	}

	await createSession(user.id);

	return NextResponse.json({
		user: {
			id: user.id,
			login: user.login,
			fullName: user.fullName,
			employee: user.employee
				? {
						id: user.employee.id,
						fullName: user.employee.fullName,
						role: user.employee.role,
					}
				: null,
			student: user.student
				? {
						id: user.student.id,
						fullName: user.student.fullName,
						classId: user.student.classId,
					}
				: null,
		},
	});
}
