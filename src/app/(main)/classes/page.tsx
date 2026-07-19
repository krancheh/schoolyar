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
import { listClasses } from "@entities/class/service";
import { listAcademicYears } from "@entities/academic-year/service";
import { listEmployees } from "@entities/employee/service";
import {
	CreateEntityButton,
	EditEntityButton,
	EntityField,
} from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Классы — Школьный портал" };

export default async function ClassesPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const isManager = MANAGER_ROLES.includes(user.employee.role);
	const [classes, years, employees] = await Promise.all([
		listClasses(),
		isManager ? listAcademicYears() : Promise.resolve([]),
		isManager ? listEmployees() : Promise.resolve([]),
	]);

	const yearOptions = years.map((year) => ({
		value: String(year.id),
		label: year.name,
	}));
	const teacherOptions = employees.map((employee) => ({
		value: String(employee.id),
		label: employee.fullName,
	}));

	const createFields: EntityField[] = [
		{ name: "name", label: "Название", required: true },
		{
			name: "academicYearId",
			label: "Учебный год",
			type: "select",
			required: true,
			numeric: true,
			options: yearOptions,
		},
		{
			name: "homeroomTeacherId",
			label: "Классный руководитель",
			type: "select",
			numeric: true,
			nullable: true,
			options: teacherOptions,
		},
	];
	const editFields: EntityField[] = [
		{ name: "name", label: "Название", required: true },
		{
			name: "homeroomTeacherId",
			label: "Классный руководитель",
			type: "select",
			numeric: true,
			nullable: true,
			options: teacherOptions,
		},
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Классы</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый класс"
						fields={createFields}
						url="/api/classes"
					/>
				)}
			</Group>
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
								{isManager && <TableTh />}
							</TableTr>
						</TableThead>
						<TableTbody>
							{classes.map((cls) => (
								<TableTr key={cls.id}>
									<TableTd>{cls.name}</TableTd>
									<TableTd>{cls.academicYear.name}</TableTd>
									<TableTd>{cls.homeroomTeacher?.fullName ?? "—"}</TableTd>
									<TableTd ta="center">{cls._count.students}</TableTd>
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={`Класс ${cls.name}`}
												fields={editFields}
												url={`/api/classes/${cls.id}`}
												initial={{
													name: cls.name,
													homeroomTeacherId: cls.homeroomTeacherId,
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
