import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Отчёты — Школьный портал" };

export default function ReportsPage() {
	return (
		<PagePlaceholder
			title="Отчёты"
			description="Посещаемость, успеваемость и заполнение журнала."
		/>
	);
}
