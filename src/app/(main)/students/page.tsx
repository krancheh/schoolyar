import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { formatDate } from "@shared/lib/format";
import { listStudents } from "@entities/student/service";

export const metadata: Metadata = { title: "Ученики — Школьный портал" };

export default async function StudentsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const students = await listStudents();

	return (
		<Stack gap="md">
			<Title order={2}>Ученики</Title>
			{students.length === 0 ? (
				<Text c="dimmed">Учеников пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={640}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>ФИО</TableTh>
								<TableTh>Класс</TableTh>
								<TableTh>Дата рождения</TableTh>
								<TableTh>Зачислен</TableTh>
								<TableTh>Статус</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{students.map((student) => (
								<TableTr key={student.id}>
									<TableTd>{student.fullName}</TableTd>
									<TableTd>{student.class?.name ?? "—"}</TableTd>
									<TableTd>{formatDate(student.birthDate)}</TableTd>
									<TableTd>{formatDate(student.enrolledAt)}</TableTd>
									<TableTd>
										<Badge
											variant="light"
											color={student.isActive ? "green" : "gray"}
										>
											{student.isActive ? "Учится" : "Отчислен"}
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
