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
import { EMPLOYEE_ROLE_LABELS } from "@shared/lib/labels";
import { listEmployees } from "@entities/employee/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Сотрудники — Школьный портал" };

export default async function EmployeesPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const isManager = MANAGER_ROLES.includes(user.employee.role);
	const employees = await listEmployees();

	const roleOptions = Object.entries(EMPLOYEE_ROLE_LABELS).map(([value, label]) => ({
		value,
		label,
	}));
	const baseFields: EntityField[] = [
		{ name: "fullName", label: "ФИО", required: true },
		{ name: "role", label: "Роль", type: "select", required: true, options: roleOptions },
		{ name: "email", label: "Email", nullable: true },
		{ name: "phone", label: "Телефон", nullable: true },
	];
	const editFields: EntityField[] = [
		...baseFields,
		{ name: "isActive", label: "Работает", type: "checkbox" },
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Сотрудники</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый сотрудник"
						fields={baseFields}
						url="/api/employees"
					/>
				)}
			</Group>
			{employees.length === 0 ? (
				<Text c="dimmed">Сотрудников пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={640}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>ФИО</TableTh>
								<TableTh>Роль</TableTh>
								<TableTh>Email</TableTh>
								<TableTh>Телефон</TableTh>
								<TableTh>Статус</TableTh>
								{isManager && <TableTh />}
							</TableTr>
						</TableThead>
						<TableTbody>
							{employees.map((employee) => (
								<TableTr key={employee.id}>
									<TableTd>{employee.fullName}</TableTd>
									<TableTd>{EMPLOYEE_ROLE_LABELS[employee.role]}</TableTd>
									<TableTd>{employee.email ?? "—"}</TableTd>
									<TableTd>{employee.phone ?? "—"}</TableTd>
									<TableTd>
										<Badge
											variant="light"
											color={employee.isActive ? "green" : "gray"}
										>
											{employee.isActive ? "Работает" : "Не работает"}
										</Badge>
									</TableTd>
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={employee.fullName}
												fields={editFields}
												url={`/api/employees/${employee.id}`}
												initial={{
													fullName: employee.fullName,
													role: employee.role,
													email: employee.email,
													phone: employee.phone,
													isActive: employee.isActive,
												}}
											/>
										</TableTd>
									)}
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
