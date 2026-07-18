import { Stack, Text, Title } from "@mantine/core";

// Заглушка раздела: заголовок + описание, пока страница не наполнена.
export function PagePlaceholder({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<Stack gap="xs">
			<Title order={2}>{title}</Title>
			<Text c="dimmed">{description ?? "Раздел в разработке."}</Text>
		</Stack>
	);
}
