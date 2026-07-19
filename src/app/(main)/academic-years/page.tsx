import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
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
import { formatDate, formatDateInput } from "@shared/lib/format";
import { termLabel } from "@shared/lib/labels";
import { listAcademicYears } from "@entities/academic-year/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";

export const metadata: Metadata = {
	title: "Периоды обучения — Школьный портал",
};

const TERM_TYPE_OPTIONS = [
	{ value: "QUARTER", label: "Четверть" },
	{ value: "TRIMESTER", label: "Триместр" },
	{ value: "SEMESTER", label: "Семестр" },
];

const yearFields: EntityField[] = [
	{ name: "name", label: "Название («2026/2027»)", required: true },
	{ name: "startDate", label: "Начало", type: "date", required: true },
	{ name: "endDate", label: "Конец", type: "date", required: true },
];

const termFields: EntityField[] = [
	{
		name: "type",
		label: "Тип периода",
		type: "select",
		required: true,
		options: TERM_TYPE_OPTIONS,
	},
	{ name: "number", label: "Номер внутри года", type: "number", required: true, numeric: true },
	{ name: "startDate", label: "Начало", type: "date", required: true },
	{ name: "endDate", label: "Конец", type: "date", required: true },
];

export default async function AcademicYearsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const isManager = MANAGER_ROLES.includes(user.employee.role);
	const years = await listAcademicYears();

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Периоды обучения</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый учебный год"
						fields={yearFields}
						url="/api/academic-years"
					/>
				)}
			</Group>
			{years.length === 0 ? (
				<Text c="dimmed">Учебные годы пока не заведены.</Text>
			) : (
				<TableScrollContainer minWidth={720}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Учебный год</TableTh>
								<TableTh>Начало</TableTh>
								<TableTh>Конец</TableTh>
								<TableTh>Четверти / семестры</TableTh>
								{isManager && <TableTh />}
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
											<Stack gap={4}>
												{year.terms.map((term) => (
													<Group gap="xs" key={term.id}>
														<Text size="sm">
															{termLabel(term)}:{" "}
															{formatDate(term.startDate)} —{" "}
															{formatDate(term.endDate)}
														</Text>
														{isManager && (
															<EditEntityButton
																title={`${termLabel(term)} (${year.name})`}
																fields={termFields}
																url={`/api/terms/${term.id}`}
																initial={{
																	type: term.type,
																	number: term.number,
																	startDate: formatDateInput(
																		term.startDate,
																	),
																	endDate: formatDateInput(
																		term.endDate,
																	),
																}}
															/>
														)}
													</Group>
												))}
											</Stack>
										)}
									</TableTd>
									{isManager && (
										<TableTd>
											<Stack gap={4} align="flex-start">
												<EditEntityButton
													title={`Учебный год ${year.name}`}
													fields={yearFields}
													url={`/api/academic-years/${year.id}`}
													initial={{
														name: year.name,
														startDate: formatDateInput(year.startDate),
														endDate: formatDateInput(year.endDate),
													}}
												/>
												<CreateEntityButton
													title={`Новый период — ${year.name}`}
													label="+ период"
													fields={[
														{
															name: "academicYearId",
															label: "",
															type: "hidden",
															numeric: true,
														},
														...termFields,
													]}
													url="/api/terms"
													initial={{ academicYearId: year.id }}
												/>
											</Stack>
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
