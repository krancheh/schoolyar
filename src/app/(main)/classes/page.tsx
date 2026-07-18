import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Классы — Школьный портал" };

export default function ClassesPage() {
	return (
		<PagePlaceholder
			title="Классы"
			description="Классы по учебным годам, классные руководители."
		/>
	);
}
