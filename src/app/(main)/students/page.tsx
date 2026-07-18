import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Ученики — Школьный портал" };

export default function StudentsPage() {
	return (
		<PagePlaceholder
			title="Ученики"
			description="Список учеников школы с фильтром по классам."
		/>
	);
}
