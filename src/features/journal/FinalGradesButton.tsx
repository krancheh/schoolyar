"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { GradeGridStudent } from "@entities/journal/service";

type RowState = { term: string; year: string };

const GRADE_OPTIONS = ["5", "4", "3", "2"].map((value) => ({
	value,
	label: value,
}));

function toRowState(students: GradeGridStudent[]): Record<number, RowState> {
	const state: Record<number, RowState> = {};
	for (const student of students) {
		state[student.id] = {
			term: student.termGrade == null ? "" : student.termGrade,
			year: student.yearGrade == null ? "" : student.yearGrade,
		};
	}
	return state;
}

// Выставление итоговых оценок: за учебный период (PUT /api/term-grades)
// и годовых (PUT /api/year-grades). Пустое значение не отправляется.
export function FinalGradesButton({
	termId,
	academicYearId,
	subjectId,
	termName,
	students,
}: {
	termId: number;
	academicYearId: number;
	subjectId: number;
	termName: string;
	students: GradeGridStudent[];
}) {
	const router = useRouter();
	const [opened, { open, close }] = useDisclosure(false);
	const [rows, setRows] = useState<Record<number, RowState>>(() => toRowState(students));
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

		const termGrades = students
			.filter((student) => rows[student.id]?.term)
			.map((student) => ({
				studentId: student.id,
				value: rows[student.id].term,
			}));
		const yearGrades = students
			.filter((student) => rows[student.id]?.year)
			.map((student) => ({
				studentId: student.id,
				value: rows[student.id].year,
			}));
		if (termGrades.length === 0 && yearGrades.length === 0) {
			setError("Выберите хотя бы одну оценку");
			return;
		}

		setLoading(true);
		try {
			if (termGrades.length > 0) {
				const res = await fetch("/api/term-grades", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ termId, subjectId, grades: termGrades }),
				});
				const json = await res.json().catch(() => null);
				if (!res.ok) {
					setError(json?.error ?? "Не удалось сохранить оценки за период");
					return;
				}
			}
			if (yearGrades.length > 0) {
				const res = await fetch("/api/year-grades", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ academicYearId, subjectId, grades: yearGrades }),
				});
				const json = await res.json().catch(() => null);
				if (!res.ok) {
					setError(json?.error ?? "Не удалось сохранить годовые оценки");
					return;
				}
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
			<Button size="sm" variant="light" onClick={openModal}>
				Итоговые оценки
			</Button>
			<Modal
				opened={opened}
				onClose={close}
				title={`Итоговые оценки — ${termName}`}
				centered
				size="lg"
			>
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
								Пустая оценка не отправляется — уже выставленные итоговые остаются
								без изменений.
							</Text>
							<Group gap="xs" wrap="nowrap">
								<Text size="xs" c="dimmed" style={{ flex: 1 }}>
									Ученик (средний за период)
								</Text>
								<Text size="xs" c="dimmed" w={96} ta="center">
									За период
								</Text>
								<Text size="xs" c="dimmed" w={96} ta="center">
									Годовая
								</Text>
							</Group>
							{students.map((student) => (
								<Group key={student.id} wrap="nowrap">
									<Text size="sm" style={{ flex: 1 }}>
										{student.fullName}
										{student.termAverage != null && (
											<Text span size="xs" c="dimmed">
												{` (${student.termAverage})`}
											</Text>
										)}
									</Text>
									<Select
										aria-label={`За период — ${student.fullName}`}
										data={GRADE_OPTIONS}
										value={rows[student.id]?.term || null}
										onChange={(value) =>
											setRow(student.id, { term: value ?? "" })
										}
										placeholder="—"
										w={96}
										clearable
									/>
									<Select
										aria-label={`Годовая — ${student.fullName}`}
										data={GRADE_OPTIONS}
										value={rows[student.id]?.year || null}
										onChange={(value) =>
											setRow(student.id, { year: value ?? "" })
										}
										placeholder="—"
										w={96}
										clearable
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
