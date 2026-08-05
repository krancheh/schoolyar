"use client";

import { useRouter } from "next/navigation";
import { Select } from "@mantine/core";

type Option = { value: string; label: string };

// Селект учебного периода (четверть/триместр/семестр) для вкладки «Оценки»
// ученика: выбор кладётся в query-параметр, страница остаётся серверной.
export function TermSelect({ termId, terms }: { termId: string | null; terms: Option[] }) {
	const router = useRouter();

	return (
		<Select
			aria-label="Учебный период"
			placeholder="Период"
			data={terms}
			value={termId}
			onChange={(value) => {
				const query = new URLSearchParams({ tab: "grades" });
				if (value) query.set("termId", value);
				router.push(`/journal?${query.toString()}`);
			}}
			allowDeselect={false}
			w={160}
			disabled={terms.length === 0}
		/>
	);
}
