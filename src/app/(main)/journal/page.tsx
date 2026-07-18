import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Журнал — Школьный портал" };

export default function JournalPage() {
	return (
		<PagePlaceholder
			title="Журнал"
			description="Уроки: дата, тема, домашнее задание, оценки и средний балл."
		/>
	);
}
