import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { listSubjects } from "@entities/subject/service";

export const metadata: Metadata = { title: "Предметы — Школьный портал" };

export default async function SubjectsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const subjects = await listSubjects();

	return (
		<Stack gap="md">
			<Title order={2}>Предметы</Title>
			{subjects.length === 0 ? (
				<Text c="dimmed">Предметов пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={320}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh w={60}>№</TableTh>
								<TableTh>Название</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{subjects.map((subject, index) => (
								<TableTr key={subject.id}>
									<TableTd>{index + 1}</TableTd>
									<TableTd>{subject.name}</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
