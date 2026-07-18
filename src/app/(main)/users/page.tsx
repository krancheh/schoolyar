import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Пользователи — Школьный портал" };

export default function UsersPage() {
	return (
		<PagePlaceholder
			title="Пользователи"
			description="Учётные записи и их привязка к сотрудникам и ученикам."
		/>
	);
}
