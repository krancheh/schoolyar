import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	Badge,
	Group,
	Stack,
	Table,
	TableScrollContainer,
	TableTbody,
	TableTd,
	TableTh,
	TableThead,
	TableTr,
	Text,
	Title,
} from "@mantine/core";
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { formatDate } from "@shared/lib/format";
import { EMPLOYEE_ROLE_LABELS } from "@shared/lib/labels";
import { listUsers } from "@entities/user/service";
import { listEmployees } from "@entities/employee/service";
import { listStudents } from "@entities/student/service";
import { CreateEntityButton, EntityField } from "@features/crud/EntityForm";
import { DeleteEntityButton } from "@features/crud/DeleteEntityButton";

export const metadata: Metadata = { title: "Пользователи — Школьный портал" };

export default async function UsersPage() {
	const user = await getAuthUser();
	if (!user?.employee || !MANAGER_ROLES.includes(user.employee.role)) {
		redirect("/");
	}

	const [users, employees, students] = await Promise.all([
		listUsers(50),
		listEmployees(),
		listStudents(),
	]);

	const registerFields: EntityField[] = [
		{ name: "fullName", label: "ФИО", required: true },
		{ name: "login", label: "Логин", required: true },
		{
			name: "password",
			label: "Пароль",
			type: "password",
			required: true,
			description: "Не короче 8 символов",
		},
		{
			name: "role",
			label: "Роль",
			type: "radio",
			required: true,
			options: [
				{ label: "Ученик", value: "student" },
				{ label: "Сотрудник", value: "employee" },
			],
		},
		{
			name: "employeeId",
			label: "Сотрудник",
			type: "select",
			numeric: true,
			required: true,
			showWhen: { field: "role", value: "employee" },
			options: employees.map((employee) => ({
				value: String(employee.id),
				label: employee.fullName,
			})),
		},
		{
			name: "studentId",
			label: "Ученик",
			type: "select",
			numeric: true,
			required: true,
			showWhen: { field: "role", value: "student" },
			options: students.map((student) => ({
				value: String(student.id),
				label: `${student.fullName}${student.class ? ` (${student.class.name})` : ""}`,
			})),
		},
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Пользователи</Title>
				<CreateEntityButton
					title="Новая учётная запись"
					fields={registerFields}
					initial={{ role: "student" }}
					url="/api/auth/register"
				/>
			</Group>
			{users.length === 0 ? (
				<Text c="dimmed">Учётных записей пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={640}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Логин</TableTh>
								<TableTh>ФИО</TableTh>
								<TableTh>Привязка</TableTh>
								<TableTh>Создана</TableTh>
								<TableTh w={40} />
							</TableTr>
						</TableThead>
						<TableTbody>
							{users.map((account) => (
								<TableTr key={account.id}>
									<TableTd>{account.login}</TableTd>
									<TableTd>{account.fullName}</TableTd>
									<TableTd>
										{account.employee ? (
											<Badge variant="light">
												{EMPLOYEE_ROLE_LABELS[account.employee.role]} —{" "}
												{account.employee.fullName}
											</Badge>
										) : account.student ? (
											<Badge variant="light" color="teal">
												Ученик — {account.student.fullName}
											</Badge>
										) : (
											<Text size="sm" c="dimmed">
												без привязки
											</Text>
										)}
									</TableTd>
									<TableTd>{formatDate(account.createdAt)}</TableTd>
									<TableTd>
										{account.id !== user.id && (
											<DeleteEntityButton
												name={account.login}
												url={`/api/users/${account.id}`}
												description="Пользователь потеряет доступ к системе. Сотрудник или ученик останутся без изменений."
											/>
										)}
									</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
