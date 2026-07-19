import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	Badge,
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
import { listStudents } from "@entities/student/service";
import { listClasses } from "@entities/class/service";
import {
	CreateEntityButton,
	EditEntityButton,
	EntityField,
} from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Ученики — Школьный портал" };

export default async function StudentsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const isManager = MANAGER_ROLES.includes(user.employee.role);
	const [students, classes] = await Promise.all([
		listStudents(),
		isManager ? listClasses() : Promise.resolve([]),
	]);

	const classOptions = classes.map((cls) => ({
		value: String(cls.id),
		label: `${cls.name} (${cls.academicYear.name})`,
	}));
	const baseFields: EntityField[] = [
		{ name: "fullName", label: "ФИО", required: true },
		{ name: "birthDate", label: "Дата рождения", type: "date", nullable: true },
		{
			name: "classId",
			label: "Класс",
			type: "select",
			numeric: true,
			nullable: true,
			options: classOptions,
		},
	];
	const editFields: EntityField[] = [
		...baseFields,
		{ name: "isActive", label: "Учится", type: "checkbox" },
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Ученики</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый ученик"
						fields={baseFields}
						url="/api/students"
					/>
				)}
			</Group>
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
								{isManager && <TableTh />}
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
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={student.fullName}
												fields={editFields}
												url={`/api/students/${student.id}`}
												initial={{
													fullName: student.fullName,
													birthDate: formatDateInput(student.birthDate),
													classId: student.classId,
													isActive: student.isActive,
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
