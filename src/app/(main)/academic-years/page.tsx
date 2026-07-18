import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { formatDate } from "@shared/lib/format";
import { termLabel } from "@shared/lib/labels";
import { listAcademicYears } from "@entities/academic-year/service";

export const metadata: Metadata = {
	title: "Периоды обучения — Школьный портал",
};

export default async function AcademicYearsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const years = await listAcademicYears();

	return (
		<Stack gap="md">
			<Title order={2}>Периоды обучения</Title>
			{years.length === 0 ? (
				<Text c="dimmed">Учебные годы пока не заведены.</Text>
			) : (
				<TableScrollContainer minWidth={640}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Учебный год</TableTh>
								<TableTh>Начало</TableTh>
								<TableTh>Конец</TableTh>
								<TableTh>Четверти / семестры</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{years.map((year) => (
								<TableTr key={year.id}>
									<TableTd>{year.name}</TableTd>
									<TableTd>{formatDate(year.startDate)}</TableTd>
									<TableTd>{formatDate(year.endDate)}</TableTd>
									<TableTd>
										{year.terms.length === 0 ? (
											<Text size="sm" c="dimmed">
												не заведены
											</Text>
										) : (
											<Stack gap={2}>
												{year.terms.map((term) => (
													<Text size="sm" key={term.id}>
														{termLabel(term)}: {formatDate(term.startDate)} —{" "}
														{formatDate(term.endDate)}
													</Text>
												))}
											</Stack>
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
