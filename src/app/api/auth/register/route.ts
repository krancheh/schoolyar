import { NextResponse } from "next/server";
import { EmployeeRole, Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";
import {
	MANAGER_ROLES,
	createSession,
	getAuthUser,
	hashPassword,
} from "@shared/lib/auth";

type RegisterBody = {
	login?: string;
	password?: string;
	fullName?: string;
	employeeId?: number;
	studentId?: number;
};

// Регистрация учётной записи.
//
// Bootstrap: пока в системе нет ни одного пользователя-администратора,
// первый запрос создаёт пользователя вместе с сотрудником ADMIN и сразу
// авторизует его. Дальше регистрировать может только менеджер
// (ADMIN / DIRECTOR / HEAD_TEACHER), опционально привязывая учётку
// к сотруднику или ученику.
export async function POST(request: Request) {
	const body = await parseBody<RegisterBody>(request);

	const login = body?.login?.trim();
	if (!login) return jsonError("login is required");
	if (!body?.password || body.password.length < 8) {
		return jsonError("password must be at least 8 characters");
	}
	if (!body.fullName?.trim()) return jsonError("fullName is required");
	if (body.employeeId && body.studentId) {
		return jsonError("Account can be linked to employee or student, not both");
	}

	const adminExists =
		(await prisma.user.count({
			where: { employee: { role: { in: MANAGER_ROLES } } },
		})) > 0;

	const bootstrap = !adminExists;
	if (!bootstrap) {
		const current = await getAuthUser();
		if (!current) return jsonError("Authentication required", 401);
		if (
			!current.employee ||
			!MANAGER_ROLES.includes(current.employee.role)
		) {
			return jsonError("Manager role required", 403);
		}
	}

	if (body.employeeId) {
		const employee = await prisma.employee.findUnique({
			where: { id: body.employeeId },
		});
		if (!employee) return jsonError(`Employee ${body.employeeId} not found`, 404);
	}
	if (body.studentId) {
		const student = await prisma.student.findUnique({
			where: { id: body.studentId },
		});
		if (!student) return jsonError(`Student ${body.studentId} not found`, 404);
	}

	try {
		const user = await prisma.user.create({
			data: {
				login,
				passwordHash: hashPassword(body.password),
				fullName: body.fullName.trim(),
				// При bootstrap создаём сотрудника-администратора.
				...(bootstrap
					? {
							employee: {
								create: {
									fullName: body.fullName.trim(),
									role: EmployeeRole.ADMIN,
								},
							},
						}
					: {
							employeeId: body.employeeId,
							studentId: body.studentId,
						}),
			},
			select: {
				id: true,
				login: true,
				fullName: true,
				employeeId: true,
				studentId: true,
			},
		});

		if (bootstrap) await createSession(user.id);

		return NextResponse.json({ user, bootstrap }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return jsonError(
				"Login is taken or employee/student already has an account",
				409
			);
		}
		throw error;
	}
}
