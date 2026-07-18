import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { listClasses } from "@entities/class/service";

export const metadata: Metadata = { title: "Классы — Школьный портал" };

export default async function ClassesPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const classes = await listClasses();

	return (
		<Stack gap="md">
			<Title order={2}>Классы</Title>
			{classes.length === 0 ? (
				<Text c="dimmed">Классов пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={560}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Класс</TableTh>
								<TableTh>Учебный год</TableTh>
								<TableTh>Классный руководитель</TableTh>
								<TableTh ta="center">Учеников</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{classes.map((cls) => (
								<TableTr key={cls.id}>
									<TableTd>{cls.name}</TableTd>
									<TableTd>{cls.academicYear.name}</TableTd>
									<TableTd>{cls.homeroomTeacher?.fullName ?? "—"}</TableTd>
									<TableTd ta="center">{cls._count.students}</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
