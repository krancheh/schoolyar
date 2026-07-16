import { AppShell, AppShellHeader, Burger, Text } from "@mantine/core";
import { prisma } from "@shared/lib/db";

export default async function Home() {
	const users = await prisma.user.findMany({
		take: 10,
		orderBy: { createdAt: "desc" },
	});

	return (
		<AppShell>
			<AppShellHeader>
				<Burger />
			</AppShellHeader>
			<div style={{ padding: 24 }}>
				<Text size="lg" fw={600}>
					Пользователи из PostgreSQL
				</Text>
				<ul>
					{users.map((user) => (
						<li key={user.id}>{user.fullName}</li>
					))}
				</ul>
			</div>
		</AppShell>
	);
}
