import type { Metadata } from "next";
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
import { getAuthUser } from "@shared/lib/auth";
import { DAY_NAMES, formatDate } from "@shared/lib/format";
import { listLessons } from "@entities/journal/service";
import { listClasses } from "@entities/class/service";
import { listSubjects } from "@entities/subject/service";
import { listEmployees } from "@entities/employee/service";
import { listScheduleSlots } from "@entities/schedule/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Журнал — Школьный портал" };

export default async function JournalPage() {
	const user = await getAuthUser();
	// Записи журнала ведут сотрудники (учителя и администрация).
	const canEdit = !!user?.employee;

	// Ученик видит журнал своего класса, сотрудники — весь.
	const [entries, classes, subjects, employees, slots] = await Promise.all([
		listLessons(user?.student?.classId ? { classId: user.student.classId } : {}),
		canEdit ? listClasses() : Promise.resolve([]),
		canEdit ? listSubjects() : Promise.resolve([]),
		canEdit ? listEmployees() : Promise.resolve([]),
		canEdit ? listScheduleSlots() : Promise.resolve([]),
	]);
	const latestFirst = entries.slice().reverse();

	const createFields: EntityField[] = [
		{ name: "date", label: "Дата урока", type: "date", required: true },
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
			name: "scheduleSlotId",
			label: "Урок из расписания (необязательно)",
			type: "select",
			numeric: true,
			options: slots.map((slot) => ({
				value: String(slot.id),
				label: `${DAY_NAMES[slot.dayOfWeek]}, урок ${slot.lessonNumber} — ${slot.class.name}, ${slot.subject.name}`,
			})),
		},
		{ name: "topic", label: "Тема" },
		{ name: "homework", label: "Домашнее задание" },
	];
	const editFields: EntityField[] = [
		{ name: "topic", label: "Тема", nullable: true },
		{ name: "homework", label: "Домашнее задание", nullable: true },
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Журнал</Title>
				{canEdit && (
					<CreateEntityButton
						title="Новая запись журнала"
						fields={createFields}
						url="/api/journal"
					/>
				)}
			</Group>
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
								{canEdit && <TableTh />}
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
									{canEdit && (
										<TableTd>
											<EditEntityButton
												title={`${entry.subject.name}, ${formatDate(entry.date)}`}
												fields={editFields}
												url={`/api/journal/${entry.id}`}
												initial={{
													topic: entry.topic,
													homework: entry.homework,
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
