import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError } from "@shared/lib/api";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

// Роли, которым разрешено управление справочниками (сотрудники, ученики,
// классы, расписание и т.п.) и регистрация новых учётных записей.
export const MANAGER_ROLES: EmployeeRole[] = [
	EmployeeRole.ADMIN,
	EmployeeRole.DIRECTOR,
	EmployeeRole.HEAD_TEACHER,
];

// Пароль хранится как "scrypt:<salt hex>:<hash hex>".
export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, 64);
	return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [scheme, saltHex, hashHex] = stored.split(":");
	if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
	const expected = Buffer.from(hashHex, "hex");
	const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
	return timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

// Создаёт сессию в БД и ставит httpOnly-cookie. В БД хранится только
// sha256-хэш токена — утечка таблицы сессий не даёт готовых токенов.
export async function createSession(userId: number) {
	const token = randomBytes(32).toString("base64url");
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	await prisma.session.create({
		data: { tokenHash: hashToken(token), userId, expiresAt },
	});

	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: SESSION_TTL_MS / 1000,
	});
}

export async function destroySession() {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE)?.value;
	if (token) {
		await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
	}
	cookieStore.delete(SESSION_COOKIE);
}

export type AuthUser = {
	id: number;
	fullName: string;
	login: string;
	employee: { id: number; fullName: string; role: EmployeeRole } | null;
	student: { id: number; fullName: string; classId: number | null } | null;
};

// Текущий пользователь по cookie сессии; протухшие сессии удаляются.
export async function getAuthUser(): Promise<AuthUser | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE)?.value;
	if (!token) return null;

	const session = await prisma.session.findUnique({
		where: { tokenHash: hashToken(token) },
		include: {
			user: {
				include: {
					employee: { select: { id: true, fullName: true, role: true, isActive: true } },
					student: {
						select: { id: true, fullName: true, classId: true, isActive: true },
					},
				},
			},
		},
	});
	if (!session) return null;

	if (session.expiresAt.getTime() <= Date.now()) {
		await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		return null;
	}

	const { user } = session;
	return {
		id: user.id,
		fullName: user.fullName,
		login: user.login,
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
	};
}

// Хелперы для route handlers: возвращают либо пользователя, либо готовый
// NextResponse с ошибкой (проверяется через instanceof NextResponse).

export async function requireAuth(): Promise<AuthUser | NextResponse> {
	const user = await getAuthUser();
	return user ?? jsonError("Authentication required", 401);
}

// Любой сотрудник (ведение журнала, оценки, посещаемость, отчёты).
export async function requireEmployee(): Promise<AuthUser | NextResponse> {
	const user = await getAuthUser();
	if (!user) return jsonError("Authentication required", 401);
	if (!user.employee) return jsonError("Employee account required", 403);
	return user;
}

// ADMIN / DIRECTOR / HEAD_TEACHER (управление справочниками и учётками).
export async function requireManager(): Promise<AuthUser | NextResponse> {
	const user = await getAuthUser();
	if (!user) return jsonError("Authentication required", 401);
	if (!user.employee || !MANAGER_ROLES.includes(user.employee.role)) {
		return jsonError("Manager role required", 403);
	}
	return user;
}
