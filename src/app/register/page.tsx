import type { Metadata } from "next";
import { prisma } from "@shared/lib/db";
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { RegisterForm } from "@features/auth/RegisterForm";

export const metadata: Metadata = {
	title: "Регистрация — Школьный портал",
};

// Менеджеры регистрируют учётки с этой же страницы, поэтому
// авторизованных отсюда не редиректим.
export default async function RegisterPage() {
	const [user, adminCount] = await Promise.all([
		getAuthUser(),
		prisma.user.count({ where: { employee: { role: { in: MANAGER_ROLES } } } }),
	]);

	const isManager =
		!!user?.employee && MANAGER_ROLES.includes(user.employee.role);

	return <RegisterForm bootstrap={adminCount === 0} isManager={isManager} />;
}
