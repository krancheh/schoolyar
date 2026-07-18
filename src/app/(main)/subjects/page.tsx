import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Предметы — Школьный портал" };

export default function SubjectsPage() {
	return <PagePlaceholder title="Предметы" description="Список предметов." />;
}
