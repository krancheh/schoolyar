import { redirect } from "next/navigation";
import { EmployeeRole } from "@prisma/client";
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { AppLayout } from "@features/navigation/AppLayout";

const ROLE_LABELS: Record<EmployeeRole, string> = {
	TEACHER: "Учитель",
	HEAD_TEACHER: "Завуч",
	DIRECTOR: "Директор",
	ADMIN: "Администратор",
};

export default async function MainLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getAuthUser();
	if (!user) redirect("/login");

	const isEmployee = !!user.employee;
	const isManager = isEmployee && MANAGER_ROLES.includes(user.employee!.role);
	const roleLabel = user.employee
		? ROLE_LABELS[user.employee.role]
		: user.student
			? "Ученик"
			: "Пользователь";

	return (
		<AppLayout
			user={{
				fullName: user.fullName,
				roleLabel,
				isStudent: !!user.student,
				isEmployee,
				isManager,
			}}
		>
			{children}
		</AppLayout>
	);
}
