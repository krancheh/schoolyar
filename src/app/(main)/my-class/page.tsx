import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Мой класс — Школьный портал" };

export default function MyClassPage() {
	return (
		<PagePlaceholder
			title="Мой класс"
			description="Одноклассники, классный руководитель и учебный год."
		/>
	);
}
