import type { Metadata } from "next";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Замены — Школьный портал" };

export default function SubstitutionsPage() {
	return (
		<PagePlaceholder
			title="Замены"
			description="Разовые замены учителей по датам."
		/>
	);
}
