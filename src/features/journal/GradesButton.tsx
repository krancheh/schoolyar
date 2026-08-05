"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

export type GradeRow = {
	studentId: number;
	fullName: string;
	value: number | null;
	comment: string | null;
};

type RowState = { value: string; comment: string };

const GRADE_OPTIONS = ["5", "4", "3", "2", "1"].map((value) => ({
	value,
	label: value,
}));

function toRowState(students: GradeRow[]): Record<number, RowState> {
	const state: Record<number, RowState> = {};
	for (const student of students) {
		state[student.studentId] = {
			value: student.value == null ? "" : String(student.value),
			comment: student.comment ?? "",
		};
	}
	return state;
}

// Данные для создания записи журнала по уроку из расписания,
// у которого записи ещё нет (lessonId = null).
export type CreateLessonPayload = {
	date: string;
	classId: number;
	subjectId: number;
	teacherId: number;
	scheduleSlotId: number;
};

// Выставление оценок за урок: список учеников класса с выбором балла 1–5.
// Сохраняет через PUT /api/journal/:id/grades (upsert; снять оценку нельзя).
// Для урока из расписания без записи журнала запись создаётся при сохранении.
export function GradesButton({
	lessonId,
	title,
	students,
	create,
}: {
	lessonId: number | null;
	title: string;
	students: GradeRow[];
	create?: CreateLessonPayload;
}) {
	const router = useRouter();
	const [opened, { open, close }] = useDisclosure(false);
	const [rows, setRows] = useState<Record<number, RowState>>(() => toRowState(students));
	// id записи, созданной этой кнопкой: при повторной попытке не создаём дубль
	const [createdId, setCreatedId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Сброс к сохранённым оценкам при каждом открытии.
	const openModal = () => {
		setRows(toRowState(students));
		setError(null);
		open();
	};

	const setRow = (studentId: number, patch: Partial<RowState>) =>
		setRows((prev) => ({
			...prev,
			[studentId]: { ...prev[studentId], ...patch },
		}));

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		const grades = students
			.filter((student) => rows[student.studentId]?.value)
			.map((student) => ({
				studentId: student.studentId,
				value: Number(rows[student.studentId].value),
				comment: rows[student.studentId].comment.trim() || undefined,
			}));
		if (grades.length === 0) {
			setError("Выберите хотя бы одну оценку");
			return;
		}

		setLoading(true);
		try {
			let targetId = lessonId ?? createdId;
			if (targetId == null) {
				if (!create) {
					setError("Не удалось определить урок");
					return;
				}
				const createRes = await fetch("/api/journal", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(create),
				});
				const createJson = await createRes.json().catch(() => null);
				if (!createRes.ok) {
					setError(createJson?.error ?? "Не удалось создать запись журнала");
					return;
				}
				targetId = createJson.lesson.id as number;
				setCreatedId(targetId);
			}

			const res = await fetch(`/api/journal/${targetId}/grades`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ grades }),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setError(json?.error ?? "Не удалось сохранить оценки");
				return;
			}

			close();
			router.refresh();
		} catch {
			setError("Сервер недоступен, попробуйте ещё раз");
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			<Button variant="subtle" size="compact-sm" onClick={openModal}>
				Оценки
			</Button>
			<Modal opened={opened} onClose={close} title={title} centered>
				{students.length === 0 ? (
					<Text c="dimmed">В классе нет учеников.</Text>
				) : (
					<form onSubmit={handleSubmit}>
						<Stack>
							{error && (
								<Alert color="red" variant="light">
									{error}
								</Alert>
							)}
							<Text size="xs" c="dimmed">
								Пустая оценка не отправляется — уже выставленные оценки остаются без
								изменений.
							</Text>
							{students.map((student) => (
								<Group key={student.studentId} wrap="nowrap" align="flex-end">
									<Text size="sm" style={{ flex: 1 }}>
										{student.fullName}
									</Text>
									<Select
										data={GRADE_OPTIONS}
										value={rows[student.studentId]?.value || null}
										onChange={(value) =>
											setRow(student.studentId, { value: value ?? "" })
										}
										placeholder="—"
										w={72}
										clearable
									/>
									<TextInput
										value={rows[student.studentId]?.comment ?? ""}
										onChange={(event) =>
											setRow(student.studentId, {
												comment: event.currentTarget.value,
											})
										}
										placeholder="Комментарий"
										w={160}
									/>
								</Group>
							))}
							<Button type="submit" loading={loading}>
								Сохранить
							</Button>
						</Stack>
					</form>
				)}
			</Modal>
		</>
	);
}
