import { redirect } from "next/navigation";
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { EMPLOYEE_ROLE_LABELS } from "@shared/lib/labels";
import { AppLayout } from "@features/navigation/AppLayout";

export default async function MainLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getAuthUser();
	if (!user) redirect("/login");

	const isEmployee = !!user.employee;
	const isManager = isEmployee && MANAGER_ROLES.includes(user.employee!.role);
	const roleLabel = user.employee
		? EMPLOYEE_ROLE_LABELS[user.employee.role]
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
