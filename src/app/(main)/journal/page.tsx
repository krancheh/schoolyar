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
import { isoDayOfWeek, parseDate } from "@shared/lib/api";
import {
	DAY_NAMES,
	DAY_NAMES_SHORT,
	addDays,
	formatDate,
	formatDateInput,
	formatDateShort,
	formatDayTitle,
} from "@shared/lib/format";
import { LinkButton } from "@shared/ui/LinkButton";
import { getGradeGrid, getStudentWeekJournal, listLessons } from "@entities/journal/service";
import { listClasses } from "@entities/class/service";
import { listSubjects } from "@entities/subject/service";
import { listEmployees } from "@entities/employee/service";
import { listScheduleSlots } from "@entities/schedule/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";
import { GradesButton } from "@features/journal/GradesButton";
import { JournalFilters } from "@features/journal/JournalFilters";

export const metadata: Metadata = { title: "Журнал — Школьный портал" };

// Сегодняшняя дата в локальном времени сервера как YYYY-MM-DD.
function todayISO(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

// Цвет бейджа по пятибалльной шкале.
function gradeColor(value: number): string {
	if (value >= 5) return "green";
	if (value === 4) return "lime";
	if (value === 3) return "yellow";
	return "red";
}

type SearchParams = { date?: string; classId?: string; subjectId?: string };

export default async function JournalPage(props: { searchParams: Promise<SearchParams> }) {
	const [user, params] = await Promise.all([getAuthUser(), props.searchParams]);
	const canEdit = !!user?.employee;

	const todayStr = todayISO();
	const today = parseDate(todayStr)!;
	const date = parseDate(params.date) ?? today;
	const monday = addDays(date, 1 - isoDayOfWeek(date));
	const saturday = addDays(monday, 5);
	const mondayStr = formatDateInput(monday)!;
	const isCurrentWeek = mondayStr === formatDateInput(addDays(today, 1 - isoDayOfWeek(today)));

	const classIdParam = Number.parseInt(params.classId ?? "", 10);
	const subjectIdParam = Number.parseInt(params.subjectId ?? "", 10);
	const classId = Number.isInteger(classIdParam) && classIdParam > 0 ? classIdParam : null;
	const subjectId =
		Number.isInteger(subjectIdParam) && subjectIdParam > 0 ? subjectIdParam : null;

	const hrefFor = (target: Date) => {
		const query = new URLSearchParams({ date: formatDateInput(target)! });
		if (canEdit && classId) query.set("classId", String(classId));
		if (canEdit && classId && subjectId) query.set("subjectId", String(subjectId));
		return `/journal?${query.toString()}`;
	};

	// Справочники для фильтров и модалок создания (только сотрудникам).
	const [classes, subjects, employees, slots] = await Promise.all([
		canEdit ? listClasses() : Promise.resolve([]),
		canEdit ? listSubjects() : Promise.resolve([]),
		canEdit ? listEmployees() : Promise.resolve([]),
		canEdit ? listScheduleSlots() : Promise.resolve([]),
	]);

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

	let content;
	if (user?.student) {
		// Дневник ученика: 6 таблиц по дням недели с личными оценками.
		const studentClassId = user.student.classId;
		if (!studentClassId) {
			content = <Text c="dimmed">Вы не привязаны к классу — журнал недоступен.</Text>;
		} else {
			const lessons = await getStudentWeekJournal(studentClassId, user.student.id, monday);
			const byDay = new Map<string, typeof lessons>();
			for (const lesson of lessons) {
				const key = formatDateInput(lesson.date)!;
				byDay.set(key, [...(byDay.get(key) ?? []), lesson]);
			}
			content = (
				<Stack gap="lg">
					{Array.from({ length: 6 }, (_, index) => addDays(monday, index)).map((day) => {
						const dayStr = formatDateInput(day)!;
						const dayLessons = byDay.get(dayStr) ?? [];
						return (
							<Stack gap="xs" key={dayStr}>
								<Group gap="xs">
									<Title order={4}>{formatDayTitle(day)}</Title>
									{dayStr === todayStr && (
										<Badge color="green" variant="light">
											Сегодня
										</Badge>
									)}
								</Group>
								{dayLessons.length === 0 ? (
									<Text c="dimmed" size="sm">
										Уроков нет.
									</Text>
								) : (
									<TableScrollContainer minWidth={760}>
										<Table striped highlightOnHover withTableBorder>
											<TableThead>
												<TableTr>
													<TableTh ta="center" w={64}>
														Урок
													</TableTh>
													<TableTh>Предмет</TableTh>
													<TableTh>Учитель</TableTh>
													<TableTh>Тема</TableTh>
													<TableTh>Домашнее задание</TableTh>
													<TableTh ta="center">Оценка</TableTh>
													<TableTh ta="center">
														Средний по предмету
													</TableTh>
												</TableTr>
											</TableThead>
											<TableTbody>
												{dayLessons.map((lesson) => (
													<TableTr key={lesson.id}>
														<TableTd ta="center">
															{lesson.lessonNumber ?? "—"}
														</TableTd>
														<TableTd>{lesson.subject.name}</TableTd>
														<TableTd>{lesson.teacher.fullName}</TableTd>
														<TableTd>{lesson.topic ?? "—"}</TableTd>
														<TableTd>{lesson.homework ?? "—"}</TableTd>
														<TableTd ta="center">
															{lesson.grade ? (
																<Stack gap={2} align="center">
																	<Badge
																		variant="light"
																		color={gradeColor(
																			lesson.grade.value,
																		)}
																	>
																		{lesson.grade.value}
																	</Badge>
																	{lesson.grade.comment && (
																		<Text size="xs" c="dimmed">
																			{lesson.grade.comment}
																		</Text>
																	)}
																</Stack>
															) : (
																"—"
															)}
														</TableTd>
														<TableTd ta="center">
															{lesson.subjectAverage ?? "—"}
														</TableTd>
													</TableTr>
												))}
											</TableTbody>
										</Table>
									</TableScrollContainer>
								)}
							</Stack>
						);
					})}
				</Stack>
			);
		}
	} else if (canEdit && classId && subjectId) {
		// Журнал учителя: сетка «ученики × уроки недели» с оценками.
		// Уроки берутся из расписания и из фактических записей журнала;
		// у урока без записи id = null — запись создаётся при первом сохранении.
		const { students, lessons } = await getGradeGrid(classId, subjectId, monday);
		const lessonKey = (lesson: (typeof lessons)[number]) =>
			lesson.id != null
				? `l${lesson.id}`
				: `s${lesson.scheduleSlotId}:${formatDateInput(lesson.date)}`;
		const gradeByCell = new Map<string, { value: number; comment: string | null }>();
		for (const lesson of lessons) {
			for (const grade of lesson.grades) {
				gradeByCell.set(`${lessonKey(lesson)}:${grade.studentId}`, grade);
			}
		}
		// Поля модалки «Изменить» для урока из расписания без записи журнала:
		// создание записи с темой/ДЗ, реквизиты урока — скрытыми полями.
		const materializeFields: EntityField[] = [
			{ name: "date", label: "Дата", type: "hidden" },
			{ name: "classId", label: "Класс", type: "hidden", numeric: true },
			{ name: "subjectId", label: "Предмет", type: "hidden", numeric: true },
			{ name: "teacherId", label: "Учитель", type: "hidden", numeric: true },
			{ name: "scheduleSlotId", label: "Слот", type: "hidden", numeric: true },
			{ name: "topic", label: "Тема" },
			{ name: "homework", label: "Домашнее задание" },
		];
		content =
			lessons.length === 0 ? (
				<Text c="dimmed">
					На этой неделе уроков по выбранному предмету нет — ни в расписании, ни в
					журнале.
				</Text>
			) : (
				<Stack gap="lg">
					<TableScrollContainer minWidth={560}>
						<Table striped highlightOnHover withTableBorder>
							<TableThead>
								<TableTr>
									<TableTh>Ученик</TableTh>
									{lessons.map((lesson) => (
										<TableTh key={lessonKey(lesson)} ta="center">
											{`${DAY_NAMES_SHORT[isoDayOfWeek(lesson.date)]} ${formatDateShort(lesson.date)}`}
										</TableTh>
									))}
									<TableTh ta="center">Средний (четверть)</TableTh>
								</TableTr>
							</TableThead>
							<TableTbody>
								{students.length === 0 ? (
									<TableTr>
										<TableTd colSpan={lessons.length + 2}>
											<Text c="dimmed">В классе нет учеников.</Text>
										</TableTd>
									</TableTr>
								) : (
									students.map((student) => (
										<TableTr key={student.id}>
											<TableTd>{student.fullName}</TableTd>
											{lessons.map((lesson) => {
												const grade = gradeByCell.get(
													`${lessonKey(lesson)}:${student.id}`,
												);
												return (
													<TableTd
														key={lessonKey(lesson)}
														ta="center"
														title={grade?.comment ?? undefined}
													>
														{grade ? (
															<Badge
																variant="light"
																color={gradeColor(grade.value)}
															>
																{grade.value}
															</Badge>
														) : (
															"—"
														)}
													</TableTd>
												);
											})}
											<TableTd ta="center" fw={600}>
												{student.termAverage ?? "—"}
											</TableTd>
										</TableTr>
									))
								)}
							</TableTbody>
						</Table>
					</TableScrollContainer>

					<Stack gap="xs">
						<Title order={4}>Уроки недели</Title>
						<Text size="xs" c="dimmed">
							Показаны все уроки из расписания. Для урока с пометкой «нет записи»
							запись журнала создаётся автоматически при сохранении оценок или темы.
						</Text>
						<TableScrollContainer minWidth={760}>
							<Table striped highlightOnHover withTableBorder>
								<TableThead>
									<TableTr>
										<TableTh>Дата</TableTh>
										<TableTh>Учитель</TableTh>
										<TableTh>Тема</TableTh>
										<TableTh>Домашнее задание</TableTh>
										<TableTh ta="center">Средний за урок</TableTh>
										<TableTh w={160} />
									</TableTr>
								</TableThead>
								<TableTbody>
									{lessons.map((lesson) => (
										<TableTr key={lessonKey(lesson)}>
											<TableTd>
												{formatDate(lesson.date)}
												{lesson.lessonNumber != null && (
													<Text size="xs" c="dimmed">
														урок {lesson.lessonNumber}
													</Text>
												)}
												{lesson.id == null && (
													<Badge
														mt={4}
														color="gray"
														variant="light"
														size="sm"
													>
														нет записи
													</Badge>
												)}
											</TableTd>
											<TableTd>{lesson.teacher.fullName}</TableTd>
											<TableTd>{lesson.topic ?? "—"}</TableTd>
											<TableTd>{lesson.homework ?? "—"}</TableTd>
											<TableTd ta="center">
												{lesson.averageGrade != null ? (
													<Badge variant="light">
														{lesson.averageGrade}
													</Badge>
												) : (
													"—"
												)}
											</TableTd>
											<TableTd>
												<Group gap={4} wrap="nowrap">
													<GradesButton
														lessonId={lesson.id}
														title={`Оценки — ${formatDate(lesson.date)}`}
														create={
															lesson.id == null
																? {
																		date: formatDateInput(
																			lesson.date,
																		)!,
																		classId,
																		subjectId,
																		teacherId:
																			lesson.teacher.id,
																		scheduleSlotId:
																			lesson.scheduleSlotId!,
																	}
																: undefined
														}
														students={students.map((student) => {
															const grade = gradeByCell.get(
																`${lessonKey(lesson)}:${student.id}`,
															);
															return {
																studentId: student.id,
																fullName: student.fullName,
																value: grade?.value ?? null,
																comment: grade?.comment ?? null,
															};
														})}
													/>
													{lesson.id != null ? (
														<EditEntityButton
															title={`Урок ${formatDate(lesson.date)}`}
															fields={editFields}
															url={`/api/journal/${lesson.id}`}
															initial={{
																topic: lesson.topic,
																homework: lesson.homework,
															}}
														/>
													) : (
														<CreateEntityButton
															title={`Урок ${formatDate(lesson.date)}`}
															label="Изменить"
															variant="subtle"
															size="compact-sm"
															fields={materializeFields}
															url="/api/journal"
															initial={{
																date: formatDateInput(lesson.date),
																classId,
																subjectId,
																teacherId: lesson.teacher.id,
																scheduleSlotId:
																	lesson.scheduleSlotId,
															}}
														/>
													)}
												</Group>
											</TableTd>
										</TableTr>
									))}
								</TableTbody>
							</Table>
						</TableScrollContainer>
					</Stack>
				</Stack>
			);
	} else if (canEdit) {
		content = <Text c="dimmed">Выберите класс и предмет, чтобы открыть журнал оценок.</Text>;
	} else {
		// Пользователь без привязки к ученику или сотруднику.
		const entries = await listLessons({});
		content = (
			<Text c="dimmed">
				{entries.length === 0
					? "Записей в журнале пока нет."
					: "Журнал доступен ученикам и сотрудникам."}
			</Text>
		);
	}

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

			<Group justify="space-between" wrap="wrap">
				<Group gap="xs">
					<LinkButton
						href={hrefFor(addDays(monday, -7))}
						variant="default"
						size="compact-sm"
					>
						← Пред. неделя
					</LinkButton>
					<Text fw={600}>
						{formatDate(monday)} – {formatDate(saturday)}
					</Text>
					<LinkButton
						href={hrefFor(addDays(monday, 7))}
						variant="default"
						size="compact-sm"
					>
						След. неделя →
					</LinkButton>
					{!isCurrentWeek && (
						<LinkButton href={hrefFor(today)} variant="light" size="compact-sm">
							Текущая неделя
						</LinkButton>
					)}
				</Group>
				{canEdit && (
					<JournalFilters
						date={mondayStr}
						classId={classId ? String(classId) : null}
						subjectId={subjectId ? String(subjectId) : null}
						classes={classes.map((cls) => ({
							value: String(cls.id),
							label: `${cls.name} (${cls.academicYear.name})`,
						}))}
						subjects={subjects.map((subject) => ({
							value: String(subject.id),
							label: subject.name,
						}))}
					/>
				)}
			</Group>

			{content}
		</Stack>
	);
}
