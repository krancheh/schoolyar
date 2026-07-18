import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { formatDate } from "@shared/lib/format";
import { EMPLOYEE_ROLE_LABELS } from "@shared/lib/labels";
import { listUsers } from "@entities/user/service";

export const metadata: Metadata = { title: "Пользователи — Школьный портал" };

export default async function UsersPage() {
	const user = await getAuthUser();
	if (!user?.employee || !MANAGER_ROLES.includes(user.employee.role)) {
		redirect("/");
	}

	const users = await listUsers(50);

	return (
		<Stack gap="md">
			<Title order={2}>Пользователи</Title>
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
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
