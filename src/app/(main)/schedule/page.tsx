import type { Metadata } from "next";
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
import { DAY_NAMES } from "@shared/lib/format";
import { termLabel } from "@shared/lib/labels";
import { listScheduleSlots } from "@entities/schedule/service";
import { listTerms } from "@entities/term/service";
import { listClasses } from "@entities/class/service";
import { listSubjects } from "@entities/subject/service";
import { listEmployees } from "@entities/employee/service";
import {
	CreateEntityButton,
	EditEntityButton,
	EntityField,
} from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Расписание — Школьный портал" };

export default async function SchedulePage() {
	const user = await getAuthUser();
	const isManager =
		!!user?.employee && MANAGER_ROLES.includes(user.employee.role);

	// Ученик видит расписание своего класса, сотрудники — всё.
	const [slots, terms, classes, subjects, employees] = await Promise.all([
		listScheduleSlots(
			user?.student?.classId ? { classId: user.student.classId } : {}
		),
		isManager ? listTerms() : Promise.resolve([]),
		isManager ? listClasses() : Promise.resolve([]),
		isManager ? listSubjects() : Promise.resolve([]),
		isManager ? listEmployees() : Promise.resolve([]),
	]);

	const slotFields: EntityField[] = [
		{
			name: "termId",
			label: "Период",
			type: "select",
			required: true,
			numeric: true,
			options: terms.map((term) => ({
				value: String(term.id),
				label: `${termLabel(term)} (${term.academicYear.name})`,
			})),
		},
		{
			name: "classId",
			label: "Класс",
			type: "select",
			required: true,
			numeric: true,
			options: classes.map((cls) => ({
				value: String(cls.id),
				label: `${cls.name} (${cls.academicYear.name})`,
			})),
		},
		{
			name: "subjectId",
			label: "Предмет",
			type: "select",
			required: true,
			numeric: true,
			options: subjects.map((subject) => ({
				value: String(subject.id),
				label: subject.name,
			})),
		},
		{
			name: "teacherId",
			label: "Учитель",
			type: "select",
			required: true,
			numeric: true,
			options: employees.map((employee) => ({
				value: String(employee.id),
				label: employee.fullName,
			})),
		},
		{
			name: "dayOfWeek",
			label: "День недели",
			type: "select",
			required: true,
			numeric: true,
			options: Object.entries(DAY_NAMES).map(([value, label]) => ({
				value,
				label,
			})),
		},
		{ name: "lessonNumber", label: "Номер урока", type: "number", required: true, numeric: true },
		{ name: "room", label: "Кабинет", nullable: true },
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Расписание</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый урок в расписании"
						fields={slotFields}
						url="/api/schedule"
					/>
				)}
			</Group>
			{slots.length === 0 ? (
				<Text c="dimmed">Расписание пока не заполнено.</Text>
			) : (
				<TableScrollContainer minWidth={760}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>День</TableTh>
								<TableTh ta="center">Урок</TableTh>
								<TableTh>Класс</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh>Учитель</TableTh>
								<TableTh>Кабинет</TableTh>
								<TableTh>Период</TableTh>
								{isManager && <TableTh />}
							</TableTr>
						</TableThead>
						<TableTbody>
							{slots.map((slot) => (
								<TableTr key={slot.id}>
									<TableTd>{DAY_NAMES[slot.dayOfWeek]}</TableTd>
									<TableTd ta="center">{slot.lessonNumber}</TableTd>
									<TableTd>{slot.class.name}</TableTd>
									<TableTd>{slot.subject.name}</TableTd>
									<TableTd>{slot.teacher.fullName}</TableTd>
									<TableTd>{slot.room ?? "—"}</TableTd>
									<TableTd>{termLabel(slot.term)}</TableTd>
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={`${slot.class.name}, ${DAY_NAMES[slot.dayOfWeek]}, урок ${slot.lessonNumber}`}
												fields={slotFields}
												url={`/api/schedule/${slot.id}`}
												initial={{
													termId: slot.termId,
													classId: slot.classId,
													subjectId: slot.subjectId,
													teacherId: slot.teacherId,
													dayOfWeek: slot.dayOfWeek,
													lessonNumber: slot.lessonNumber,
													room: slot.room,
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
