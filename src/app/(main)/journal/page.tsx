import type { Metadata } from "next";
import { Badge, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { formatDate } from "@shared/lib/format";
import { listLessons } from "@entities/journal/service";

export const metadata: Metadata = { title: "Журнал — Школьный портал" };

export default async function JournalPage() {
	const user = await getAuthUser();
	// Ученик видит журнал своего класса, сотрудники — весь.
	const entries = await listLessons(
		user?.student?.classId ? { classId: user.student.classId } : {}
	);
	const latestFirst = entries.slice().reverse();

	return (
		<Stack gap="md">
			<Title order={2}>Журнал</Title>
			{latestFirst.length === 0 ? (
				<Text c="dimmed">Записей в журнале пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={800}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Дата</TableTh>
								<TableTh>Класс</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh>Учитель</TableTh>
								<TableTh>Тема</TableTh>
								<TableTh>Домашнее задание</TableTh>
								<TableTh ta="center">Средний балл</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{latestFirst.map((entry) => (
								<TableTr key={entry.id}>
									<TableTd>{formatDate(entry.date)}</TableTd>
									<TableTd>{entry.class.name}</TableTd>
									<TableTd>{entry.subject.name}</TableTd>
									<TableTd>{entry.teacher.fullName}</TableTd>
									<TableTd>{entry.topic ?? "—"}</TableTd>
									<TableTd>{entry.homework ?? "—"}</TableTd>
									<TableTd ta="center">
										{entry.averageGrade != null ? (
											<Badge variant="light">{entry.averageGrade}</Badge>
										) : (
											"—"
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
