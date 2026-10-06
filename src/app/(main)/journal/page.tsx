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
	termLabel,
} from "@shared/lib/format";
import { LinkButton } from "@shared/ui/LinkButton";
import {
	getClassTerms,
	getGradeGrid,
	getStudentTermSummary,
	getStudentWeekJournal,
	listLessons,
} from "@entities/journal/service";
import { listClasses } from "@entities/class/service";
import { listSubjects } from "@entities/subject/service";
import { listEmployees } from "@entities/employee/service";
import { listScheduleSlots } from "@entities/schedule/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";
import { GradesButton } from "@features/journal/GradesButton";
import { JournalFilters } from "@features/journal/JournalFilters";
import { TermSelect } from "@features/journal/TermSelect";
import { FinalGradesButton } from "@features/journal/FinalGradesButton";

export const metadata: Metadata = { title: "Журнал — Школьный портал" };

// Сегодняшняя дата в локальном времени сервера как YYYY-MM-DD.
function todayISO(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

// Цвет бейджа по пятибалльной шкале.
function gradeColor(value: string): string {
	switch (value) {
		case "5":
			return "green";
		case "4":
			return "green";
		case "3":
			return "green";
		case "н":
		case "у":
			return "gray";
		default:
			return "red";
	}
}

type TermOption = { id: number; type: string; number: number; startDate: Date; endDate: Date };

// Период по умолчанию: содержащий сегодняшнюю дату, иначе ближайший
// будущий, иначе последний (после конца года — итоги года).
function pickTerm(terms: TermOption[], todayTime: number): TermOption | null {
	return (
		terms.find(
			(term) => term.startDate.getTime() <= todayTime && todayTime <= term.endDate.getTime(),
		) ??
		terms.find((term) => term.startDate.getTime() > todayTime) ??
		terms[terms.length - 1] ??
		null
	);
}

function parsePositiveInt(value: string | undefined): number | null {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

type SearchParams = {
	tab?: string;
	date?: string;
	classId?: string;
	subjectId?: string;
	termId?: string;
};

export default async function JournalPage(props: { searchParams: Promise<SearchParams> }) {
	const [user, params] = await Promise.all([getAuthUser(), props.searchParams]);
	const canEdit = !!user?.employee;

	const todayStr = todayISO();
	const today = parseDate(todayStr)!;

	const classId = parsePositiveInt(params.classId);
	const subjectId = parsePositiveInt(params.subjectId);
	const termIdParam = parsePositiveInt(params.termId);

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

	let toolbar = null;
	let content;
	if (user?.student) {
		const studentClassId = user.student.classId;
		const tab = params.tab === "diary" ? "diary" : "grades";
		if (!studentClassId) {
			content = <Text c="dimmed">Вы не привязаны к классу — журнал недоступен.</Text>;
		} else if (tab === "grades") {
			// Вкладка «Оценки»: сводка по предметам за выбранный учебный период.
			const { terms } = await getClassTerms(studentClassId);
			const term =
				terms.find((candidate) => candidate.id === termIdParam) ??
				pickTerm(terms, today.getTime());

			toolbar = (
				<Group justify="space-between" wrap="wrap">
					<Group gap="xs">
						<LinkButton href="/journal?tab=grades" variant="filled" size="compact-sm">
							Оценки
						</LinkButton>
						<LinkButton href="/journal?tab=diary" variant="default" size="compact-sm">
							Дневник
						</LinkButton>
					</Group>
					<TermSelect
						termId={term ? String(term.id) : null}
						terms={terms.map((candidate) => ({
							value: String(candidate.id),
							label: termLabel(candidate.type, candidate.number),
						}))}
					/>
				</Group>
			);

			if (!term) {
				content = <Text c="dimmed">У учебного года класса не заданы учебные периоды.</Text>;
			} else {
				const rows = await getStudentTermSummary(studentClassId, user.student.id, term.id);
				content =
					rows.length === 0 ? (
						<Text c="dimmed">В этом периоде нет предметов с уроками.</Text>
					) : (
						<TableScrollContainer minWidth={720}>
							<Table striped highlightOnHover withTableBorder>
								<TableThead>
									<TableTr>
										<TableTh>Предмет</TableTh>
										<TableTh>Оценки</TableTh>
										<TableTh ta="center">
											{`Оценка за ${termLabel(term.type, term.number)}`}
										</TableTh>
										<TableTh ta="center">Итоговая оценка</TableTh>
									</TableTr>
								</TableThead>
								<TableTbody>
									{rows.map((row) => (
										<TableTr key={row.subject.id}>
											<TableTd>{row.subject.name}</TableTd>
											<TableTd>
												{row.grades.length === 0 ? (
													"—"
												) : (
													<Group gap={4}>
														{row.grades.map((grade, index) => (
															<Badge
																key={index}
																variant="light"
																color={gradeColor(grade.value)}
																title={`${formatDate(grade.date)}${grade.comment ? ` — ${grade.comment}` : ""}`}
															>
																{grade.value}
															</Badge>
														))}
													</Group>
												)}
											</TableTd>
											<TableTd ta="center">
												{row.termGrade != null ? (
													<Badge
														variant="filled"
														color={gradeColor(row.termGrade)}
													>
														{row.termGrade}
													</Badge>
												) : (
													"—"
												)}
											</TableTd>
											<TableTd ta="center">
												{row.yearGrade != null ? (
													<Badge
														variant="filled"
														color={gradeColor(row.yearGrade)}
													>
														{row.yearGrade}
													</Badge>
												) : (
													"—"
												)}
											</TableTd>
										</TableTr>
									))}
								</TableTbody>
							</Table>
						</TableScrollContainer>
					);
			}
		} else {
			// Вкладка «Дневник»: 6 таблиц по дням недели с листанием недель.
			const date = parseDate(params.date) ?? today;
			const monday = addDays(date, 1 - isoDayOfWeek(date));
			const saturday = addDays(monday, 5);
			const mondayStr = formatDateInput(monday)!;
			const isCurrentWeek =
				mondayStr === formatDateInput(addDays(today, 1 - isoDayOfWeek(today)));
			const hrefFor = (target: Date) => `/journal?tab=diary&date=${formatDateInput(target)!}`;

			toolbar = (
				<Group justify="space-between" wrap="wrap">
					<Group gap="xs">
						<LinkButton href="/journal?tab=grades" variant="default" size="compact-sm">
							Оценки
						</LinkButton>
						<LinkButton href="/journal?tab=diary" variant="filled" size="compact-sm">
							Дневник
						</LinkButton>
					</Group>
					<Group gap="xs">
						<LinkButton
							href={hrefFor(addDays(monday, -7))}
							variant="default"
							size="compact-sm"
						>
							← Пред. неделя
						</LinkButton>
						<Text fw={600}>{`${formatDate(monday)} – ${formatDate(saturday)}`}</Text>
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
				</Group>
			);

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
	} else if (canEdit) {
		// Журнал сотрудника: Класс → Предмет → Период, сетка «ученики ×
		// все уроки периода» (расписание + записи журнала) и итоговые оценки.
		const classTerms = classId ? await getClassTerms(classId) : null;
		const terms = classTerms?.terms ?? [];
		const term =
			terms.find((candidate) => candidate.id === termIdParam) ??
			pickTerm(terms, today.getTime());

		toolbar = (
			<Group justify="flex-end">
				<JournalFilters
					classId={classId ? String(classId) : null}
					subjectId={subjectId ? String(subjectId) : null}
					termId={term ? String(term.id) : null}
					classes={classes.map((cls) => ({
						value: String(cls.id),
						label: `${cls.name} (${cls.academicYear.name})`,
					}))}
					subjects={subjects.map((subject) => ({
						value: String(subject.id),
						label: subject.name,
					}))}
					terms={terms.map((candidate) => ({
						value: String(candidate.id),
						label: termLabel(candidate.type, candidate.number),
					}))}
				/>
			</Group>
		);

		if (!classId || !subjectId) {
			content = (
				<Text c="dimmed">Выберите класс и предмет, чтобы открыть журнал оценок.</Text>
			);
		} else if (!term || !classTerms) {
			content = <Text c="dimmed">У учебного года класса не заданы учебные периоды.</Text>;
		} else {
			const { students, lessons } = await getGradeGrid(classId, subjectId, term.id);
			const termName = termLabel(term.type, term.number);
			const lessonKey = (lesson: (typeof lessons)[number]) =>
				lesson.id != null
					? `l${lesson.id}`
					: `s${lesson.scheduleSlotId}:${formatDateInput(lesson.date)}`;
			const gradeByCell = new Map<string, { value: string; comment: string | null }>();
			for (const lesson of lessons) {
				for (const grade of lesson.grades) {
					gradeByCell.set(`${lessonKey(lesson)}:${grade.studentId}`, grade);
				}
			}
			content = (
				<Stack gap="lg">
					<Group justify="space-between">
						<Title order={4}>{`Оценки — ${termName}`}</Title>
						<FinalGradesButton
							termId={term.id}
							academicYearId={classTerms.academicYearId}
							subjectId={subjectId}
							termName={termName}
							students={students}
						/>
					</Group>
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
									<TableTh ta="center">Средний</TableTh>
									<TableTh ta="center">За период</TableTh>
									<TableTh ta="center">Годовая</TableTh>
								</TableTr>
							</TableThead>
							<TableTbody>
								{students.length === 0 ? (
									<TableTr>
										<TableTd colSpan={lessons.length + 4}>
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
											<TableTd ta="center">
												{student.termGrade != null ? (
													<Badge
														variant="filled"
														color={gradeColor(student.termGrade)}
													>
														{student.termGrade}
													</Badge>
												) : (
													"—"
												)}
											</TableTd>
											<TableTd ta="center">
												{student.yearGrade != null ? (
													<Badge
														variant="filled"
														color={gradeColor(student.yearGrade)}
													>
														{student.yearGrade}
													</Badge>
												) : (
													"—"
												)}
											</TableTd>
										</TableTr>
									))
								)}
							</TableTbody>
						</Table>
					</TableScrollContainer>

					<Stack gap="xs">
						<Title order={4}>Уроки периода</Title>
						{lessons.length === 0 ? (
							<Text c="dimmed">
								В этом периоде уроков по выбранному предмету нет — ни в расписании,
								ни в журнале.
							</Text>
						) : (
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
											<TableTr
												bg={
													formatDateInput(lesson.date) === todayISO()
														? "var(--mantine-color-blue-light)"
														: undefined
												}
												key={lessonKey(lesson)}
											>
												<TableTd>
													{formatDate(lesson.date)}
													{lesson.lessonNumber != null && (
														<Text size="xs" c="dimmed">
															урок {lesson.lessonNumber}
														</Text>
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
																	date: formatDateInput(
																		lesson.date,
																	),
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
						)}
					</Stack>
				</Stack>
			);
		}
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

			{toolbar}

			{content}
		</Stack>
	);
}
