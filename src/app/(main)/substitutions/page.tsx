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
import { DAY_NAMES, formatDate, formatDateInput } from "@shared/lib/format";
import { listSubstitutions } from "@entities/substitution/service";
import { listScheduleSlots } from "@entities/schedule/service";
import { listEmployees } from "@entities/employee/service";
import {
	CreateEntityButton,
	EditEntityButton,
	EntityField,
} from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Замены — Школьный портал" };

export default async function SubstitutionsPage() {
	const user = await getAuthUser();
	const isManager =
		!!user?.employee && MANAGER_ROLES.includes(user.employee.role);

	const [substitutions, slots, employees] = await Promise.all([
		listSubstitutions(),
		isManager ? listScheduleSlots() : Promise.resolve([]),
		isManager ? listEmployees() : Promise.resolve([]),
	]);

	const teacherOptions = employees.map((employee) => ({
		value: String(employee.id),
		label: employee.fullName,
	}));
	const editFields: EntityField[] = [
		{ name: "date", label: "Дата", type: "date", required: true },
		{
			name: "substituteTeacherId",
			label: "Кто заменяет",
			type: "select",
			required: true,
			numeric: true,
			options: teacherOptions,
		},
		{ name: "reason", label: "Причина", nullable: true },
	];
	const createFields: EntityField[] = [
		{
			name: "scheduleSlotId",
			label: "Урок из расписания",
			type: "select",
			required: true,
			numeric: true,
			options: slots.map((slot) => ({
				value: String(slot.id),
				label: `${DAY_NAMES[slot.dayOfWeek]}, урок ${slot.lessonNumber} — ${slot.class.name}, ${slot.subject.name} (${slot.teacher.fullName})`,
			})),
		},
		...editFields,
	];

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Замены</Title>
				{isManager && (
					<CreateEntityButton
						title="Новая замена"
						fields={createFields}
						url="/api/substitutions"
					/>
				)}
			</Group>
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
								{isManager && <TableTh />}
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
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={`Замена ${formatDate(substitution.date)}`}
												fields={editFields}
												url={`/api/substitutions/${substitution.id}`}
												initial={{
													date: formatDateInput(substitution.date),
													substituteTeacherId:
														substitution.substituteTeacherId,
													reason: substitution.reason,
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
