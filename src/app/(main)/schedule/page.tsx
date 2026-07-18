import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Расписание — Школьный портал" };

export default function SchedulePage() {
	return (
		<PagePlaceholder
			title="Расписание"
			description="Уроки по дням недели для класса или учителя."
		/>
	);
}
