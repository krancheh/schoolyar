import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = {
	title: "Периоды обучения — Школьный портал",
};

export default function AcademicYearsPage() {
	return (
		<PagePlaceholder
			title="Периоды обучения"
			description="Учебные годы, четверти и семестры."
		/>
	);
}
