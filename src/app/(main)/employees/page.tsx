import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { EMPLOYEE_ROLE_LABELS } from "@shared/lib/labels";
import { listEmployees } from "@entities/employee/service";

export const metadata: Metadata = { title: "Сотрудники — Школьный портал" };

export default async function EmployeesPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const employees = await listEmployees();

	return (
		<Stack gap="md">
			<Title order={2}>Сотрудники</Title>
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
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
