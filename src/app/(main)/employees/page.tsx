import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Сотрудники — Школьный портал" };

export default function EmployeesPage() {
	return (
		<PagePlaceholder
			title="Сотрудники"
			description="Учителя и администрация школы."
		/>
	);
}
