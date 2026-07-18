import { getAuthUser } from "@shared/lib/auth";
import { PagePlaceholder } from "@shared/ui/PagePlaceholder";

export default async function HomePage() {
	const user = await getAuthUser();

	return (
		<PagePlaceholder
			title={`Добро пожаловать, ${user?.fullName ?? "гость"}!`}
			description="Выберите раздел в меню слева."
		/>
	);
}
