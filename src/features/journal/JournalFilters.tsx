"use client";

import { useRouter } from "next/navigation";
import { Group, Select } from "@mantine/core";

type Option = { value: string; label: string };

// Каскадные фильтры журнала для сотрудников: Класс → Предмет.
// Выбор кладётся в query-параметры, страница остаётся серверной.
export function JournalFilters({
	date,
	classId,
	subjectId,
	classes,
	subjects,
}: {
	date: string;
	classId: string | null;
	subjectId: string | null;
	classes: Option[];
	subjects: Option[];
}) {
	const router = useRouter();

	const navigate = (nextClassId: string | null, nextSubjectId: string | null) => {
		const query = new URLSearchParams({ date });
		if (nextClassId) query.set("classId", nextClassId);
		if (nextClassId && nextSubjectId) query.set("subjectId", nextSubjectId);
		router.push(`/journal?${query.toString()}`);
	};

	return (
		<Group gap="xs">
			<Select
				aria-label="Класс"
				placeholder="Класс"
				data={classes}
				value={classId}
				onChange={(value) => navigate(value, subjectId)}
				searchable
				clearable
				w={220}
			/>
			<Select
				aria-label="Предмет"
				placeholder="Предмет"
				data={subjects}
				value={subjectId}
				onChange={(value) => navigate(classId, value)}
				searchable
				clearable
				w={220}
				disabled={!classId}
			/>
		</Group>
	);
}
