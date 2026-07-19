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
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { isoDayOfWeek, parseDate } from "@shared/lib/api";
import {
	DAY_NAMES,
	DAY_NAMES_SHORT,
	addDays,
	formatDateInput,
	formatDayTitle,
} from "@shared/lib/format";
import { termLabel } from "@shared/lib/labels";
import { LinkButton } from "@shared/ui/LinkButton";
import { DayScheduleEntry, getDaySchedule, listScheduleSlots } from "@entities/schedule/service";
import { listTerms } from "@entities/term/service";
import { listClasses } from "@entities/class/service";
import { listSubjects } from "@entities/subject/service";
import { listEmployees } from "@entities/employee/service";
import { listBells } from "@entities/bell-schedule/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Расписание — Школьный портал" };

// Сегодняшняя дата в локальном времени сервера как YYYY-MM-DD.
function todayISO(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

type SearchParams = { date?: string; view?: string };

export default async function SchedulePage(props: { searchParams: Promise<SearchParams> }) {
	const [user, params] = await Promise.all([getAuthUser(), props.searchParams]);
	const employee = user?.employee ?? null;
	const isManager = !!employee && MANAGER_ROLES.includes(employee.role);

	const todayStr = todayISO();
	const date = parseDate(params.date) ?? parseDate(todayStr)!;
	const dateStr = formatDateInput(date)!;
	const isToday = dateStr === todayStr;

	// Сотрудник по умолчанию видит свои уроки, если он вообще ведёт уроки;
	// администрация без нагрузки сразу попадает на общее расписание.
	let view: "my" | "all" = "all";
	if (employee) {
		if (params.view === "my" || params.view === "all") {
			view = params.view;
		} else {
			const mySlots = await listScheduleSlots({ teacherId: employee.id });
			view = mySlots.length > 0 ? "my" : "all";
		}
	}

	const studentClassId = user?.student?.classId ?? null;
	const [{ inTerm, entries }, bells] = await Promise.all([
		getDaySchedule(date, user?.student ? { classId: studentClassId ?? -1 } : {}),
		listBells(),
	]);
	const bellByNumber = new Map(
		bells.map((bell) => [bell.lessonNumber, `${bell.startTime}–${bell.endTime}`]),
	);
	const myEntries = employee
		? entries.filter(
				(entry) =>
					entry.slot.teacherId === employee.id ||
					entry.substitution?.substituteTeacher.id === employee.id,
			)
		: [];

	// Справочники нужны только менеджеру для модалок создания/правки.
	const [terms, classes, subjects, employees] = await Promise.all([
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
			options: employees.map((item) => ({
				value: String(item.id),
				label: item.fullName,
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
		{
			name: "lessonNumber",
			label: "Номер урока",
			type: "number",
			required: true,
			numeric: true,
		},
		{ name: "room", label: "Кабинет", nullable: true },
	];

	const hrefFor = (target: Date, targetView = view) =>
		`/schedule?date=${formatDateInput(target)}${employee ? `&view=${targetView}` : ""}`;

	const monday = addDays(date, 1 - isoDayOfWeek(date));
	const weekDays = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

	const editButton = (entry: DayScheduleEntry) =>
		isManager && (
			<EditEntityButton
				title={`${entry.slot.class.name}, ${DAY_NAMES[entry.slot.dayOfWeek]}, урок ${entry.slot.lessonNumber}`}
				fields={slotFields}
				url={`/api/schedule/${entry.slot.id}`}
				initial={{
					termId: entry.slot.termId,
					classId: entry.slot.classId,
					subjectId: entry.slot.subjectId,
					teacherId: entry.slot.teacherId,
					dayOfWeek: entry.slot.dayOfWeek,
					lessonNumber: entry.slot.lessonNumber,
					room: entry.slot.room,
				}}
			/>
		);

	// Номер урока + время по расписанию звонков, если оно заведено.
	const lessonCell = (lessonNumber: number) => (
		<>
			{lessonNumber}
			{bellByNumber.has(lessonNumber) && (
				<Text size="xs" c="dimmed">
					{bellByNumber.get(lessonNumber)}
				</Text>
			)}
		</>
	);

	// Учитель в ячейке: заменяющий с пометкой, если на эту дату есть замена.
	const teacherCell = (entry: DayScheduleEntry) =>
		entry.substitution ? (
			<Stack gap={2}>
				<Group gap="xs">
					<Text size="sm">{entry.substitution.substituteTeacher.fullName}</Text>
					<Badge size="sm" color="orange" variant="light">
						Замена
					</Badge>
				</Group>
				<Text size="xs" c="dimmed">
					вместо {entry.slot.teacher.fullName}
					{entry.substitution.reason ? ` — ${entry.substitution.reason}` : ""}
				</Text>
			</Stack>
		) : (
			entry.slot.teacher.fullName
		);

	let content;
	if (user?.student && !studentClassId) {
		content = <Text c="dimmed">Вы не привязаны к классу — расписание недоступно.</Text>;
	} else if (!inTerm) {
		content = <Text c="dimmed">Дата вне учебного периода — занятий нет.</Text>;
	} else if (user?.student) {
		content =
			entries.length === 0 ? (
				<Text c="dimmed">На этот день уроков нет.</Text>
			) : (
				<TableScrollContainer minWidth={560}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh ta="center" w={64}>
									Урок
								</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh>Учитель</TableTh>
								<TableTh>Кабинет</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{entries.map((entry) => (
								<TableTr key={entry.slot.id}>
									<TableTd ta="center">{lessonCell(entry.slot.lessonNumber)}</TableTd>
									<TableTd>{entry.slot.subject.name}</TableTd>
									<TableTd>{teacherCell(entry)}</TableTd>
									<TableTd>{entry.slot.room ?? "—"}</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			);
	} else if (view === "my" && employee) {
		content =
			myEntries.length === 0 ? (
				<Text c="dimmed">На этот день у вас уроков нет.</Text>
			) : (
				<TableScrollContainer minWidth={640}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh ta="center" w={64}>
									Урок
								</TableTh>
								<TableTh>Класс</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh>Кабинет</TableTh>
								<TableTh>Замена</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{myEntries.map((entry) => {
								const givenAway =
									entry.slot.teacherId === employee.id &&
									!!entry.substitution &&
									entry.substitution.substituteTeacher.id !== employee.id;
								const takenOver =
									!!entry.substitution &&
									entry.substitution.substituteTeacher.id === employee.id &&
									entry.slot.teacherId !== employee.id;
								return (
									<TableTr
										key={entry.slot.id}
										style={givenAway ? { opacity: 0.55 } : undefined}
									>
										<TableTd ta="center">{lessonCell(entry.slot.lessonNumber)}</TableTd>
										<TableTd>{entry.slot.class.name}</TableTd>
										<TableTd>{entry.slot.subject.name}</TableTd>
										<TableTd>{entry.slot.room ?? "—"}</TableTd>
										<TableTd>
											{givenAway ? (
												<Text size="sm">
													Замена:{" "}
													{entry.substitution!.substituteTeacher.fullName}
													{entry.substitution!.reason
														? ` (${entry.substitution!.reason})`
														: ""}
												</Text>
											) : takenOver ? (
												<Group gap="xs">
													<Badge size="sm" color="orange" variant="light">
														Замена
													</Badge>
													<Text size="sm" c="dimmed">
														вместо {entry.slot.teacher.fullName}
													</Text>
												</Group>
											) : (
												"—"
											)}
										</TableTd>
									</TableTr>
								);
							})}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			);
	} else {
		// Общее расписание дня, сгруппированное по классам.
		const byClass = new Map<number, { name: string; items: DayScheduleEntry[] }>();
		for (const entry of entries) {
			const group = byClass.get(entry.slot.classId);
			if (group) group.items.push(entry);
			else
				byClass.set(entry.slot.classId, {
					name: entry.slot.class.name,
					items: [entry],
				});
		}
		content =
			entries.length === 0 ? (
				<Text c="dimmed">На этот день уроков нет.</Text>
			) : (
				<Stack gap="lg">
					{[...byClass.values()].map((group) => (
						<Stack gap="xs" key={group.name}>
							<Title order={4}>{group.name}</Title>
							<TableScrollContainer minWidth={640}>
								<Table striped highlightOnHover withTableBorder>
									<TableThead>
										<TableTr>
											<TableTh ta="center" w={64}>
												Урок
											</TableTh>
											<TableTh>Предмет</TableTh>
											<TableTh>Учитель</TableTh>
											<TableTh>Кабинет</TableTh>
											{isManager && <TableTh w={40} />}
										</TableTr>
									</TableThead>
									<TableTbody>
										{group.items.map((entry) => (
											<TableTr key={entry.slot.id}>
												<TableTd ta="center">{lessonCell(entry.slot.lessonNumber)}</TableTd>
												<TableTd>{entry.slot.subject.name}</TableTd>
												<TableTd>{teacherCell(entry)}</TableTd>
												<TableTd>{entry.slot.room ?? "—"}</TableTd>
												{isManager && (
													<TableTd>{editButton(entry)}</TableTd>
												)}
											</TableTr>
										))}
									</TableTbody>
								</Table>
							</TableScrollContainer>
						</Stack>
					))}
				</Stack>
			);
	}

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

			<Group gap="xs" wrap="wrap">
				<LinkButton href={hrefFor(addDays(date, -1))} variant="default" size="compact-sm">
					←
				</LinkButton>
				{weekDays.map((day) => {
					const dayStr = formatDateInput(day)!;
					return (
						<LinkButton
							key={dayStr}
							href={hrefFor(day)}
							variant={dayStr === dateStr ? "filled" : "subtle"}
							size="compact-sm"
						>
							{DAY_NAMES_SHORT[isoDayOfWeek(day)]}
						</LinkButton>
					);
				})}
				<LinkButton href={hrefFor(addDays(date, 1))} variant="default" size="compact-sm">
					→
				</LinkButton>
				{!isToday && (
					<LinkButton
						href={hrefFor(parseDate(todayStr)!)}
						variant="light"
						size="compact-sm"
					>
						Сегодня
					</LinkButton>
				)}
			</Group>

			<Group justify="space-between">
				<Group gap="xs">
					<Title order={3}>{formatDayTitle(date)}</Title>
					{isToday && (
						<Badge color="green" variant="light">
							Сегодня
						</Badge>
					)}
				</Group>
				{employee && (
					<Group gap="xs">
						<LinkButton
							href={hrefFor(date, "my")}
							variant={view === "my" ? "filled" : "default"}
							size="compact-sm"
						>
							Моё расписание
						</LinkButton>
						<LinkButton
							href={hrefFor(date, "all")}
							variant={view === "all" ? "filled" : "default"}
							size="compact-sm"
						>
							Все классы
						</LinkButton>
					</Group>
				)}
			</Group>

			{content}
		</Stack>
	);
}
