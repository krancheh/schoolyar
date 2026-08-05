"use client";

import { useRouter } from "next/navigation";
import { Group, Select } from "@mantine/core";

type Option = { value: string; label: string };

// Каскадные фильтры журнала для сотрудников: Класс → Предмет → Период.
// Выбор кладётся в query-параметры, страница остаётся серверной.
// Периоды зависят от учебного года выбранного класса, поэтому при смене
// класса выбор периода сбрасывается (сервер подставит текущий период).
export function JournalFilters({
	classId,
	subjectId,
	termId,
	classes,
	subjects,
	terms,
}: {
	classId: string | null;
	subjectId: string | null;
	termId: string | null;
	classes: Option[];
	subjects: Option[];
	terms: Option[];
}) {
	const router = useRouter();

	const navigate = (
		nextClassId: string | null,
		nextSubjectId: string | null,
		nextTermId: string | null,
	) => {
		const query = new URLSearchParams();
		if (nextClassId) query.set("classId", nextClassId);
		if (nextClassId && nextSubjectId) query.set("subjectId", nextSubjectId);
		if (nextClassId && nextTermId) query.set("termId", nextTermId);
		router.push(`/journal?${query.toString()}`);
	};

	return (
		<Group gap="xs">
			<Select
				aria-label="Класс"
				placeholder="Класс"
				data={classes}
				value={classId}
				onChange={(value) => navigate(value, value === classId ? subjectId : null, null)}
				searchable
				clearable
				w={220}
			/>
			<Select
				aria-label="Предмет"
				placeholder="Предмет"
				data={subjects}
				value={subjectId}
				onChange={(value) => navigate(classId, value, termId)}
				searchable
				clearable
				w={220}
				disabled={!classId}
			/>
			<Select
				aria-label="Учебный период"
				placeholder="Период"
				data={terms}
				value={termId}
				onChange={(value) => navigate(classId, subjectId, value)}
				allowDeselect={false}
				w={160}
				disabled={!classId || terms.length === 0}
			/>
		</Group>
	);
}
