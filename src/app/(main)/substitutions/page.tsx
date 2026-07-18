import type { Metadata } from "next";
import { Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { formatDate } from "@shared/lib/format";
import { listSubstitutions } from "@entities/substitution/service";

export const metadata: Metadata = { title: "Замены — Школьный портал" };

export default async function SubstitutionsPage() {
	const substitutions = await listSubstitutions();

	return (
		<Stack gap="md">
			<Title order={2}>Замены</Title>
			{substitutions.length === 0 ? (
				<Text c="dimmed">Замен пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={760}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Дата</TableTh>
								<TableTh>Класс</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh ta="center">Урок</TableTh>
								<TableTh>Кого заменяют</TableTh>
								<TableTh>Кто заменяет</TableTh>
								<TableTh>Причина</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{substitutions.map((substitution) => (
								<TableTr key={substitution.id}>
									<TableTd>{formatDate(substitution.date)}</TableTd>
									<TableTd>{substitution.scheduleSlot.class.name}</TableTd>
									<TableTd>{substitution.scheduleSlot.subject.name}</TableTd>
									<TableTd ta="center">
										{substitution.scheduleSlot.lessonNumber}
									</TableTd>
									<TableTd>{substitution.scheduleSlot.teacher.fullName}</TableTd>
									<TableTd>{substitution.substituteTeacher.fullName}</TableTd>
									<TableTd>{substitution.reason ?? "—"}</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
