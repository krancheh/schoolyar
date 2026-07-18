"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	AppShell,
	Badge,
	Burger,
	Button,
	Group,
	NavLink,
	ScrollArea,
	Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { NAV_GROUPS, NavRole } from "./nav-items";

type AppLayoutProps = {
	user: NavRole & { fullName: string; roleLabel: string };
	children: React.ReactNode;
};

export function AppLayout({ user, children }: AppLayoutProps) {
	const [opened, { toggle, close }] = useDisclosure();
	const pathname = usePathname();
	const router = useRouter();

	async function handleLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		router.push("/login");
		router.refresh();
	}

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
			padding="md"
		>
			<AppShell.Header>
				<Group h="100%" px="md" justify="space-between" wrap="nowrap">
					<Group gap="sm" wrap="nowrap">
						<Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
						<Text fw={700}>Школьный портал</Text>
					</Group>
					<Group gap="xs" wrap="nowrap">
						<Text size="sm" c="dimmed" visibleFrom="xs">
							{user.fullName}
						</Text>
						<Badge variant="light">{user.roleLabel}</Badge>
					</Group>
				</Group>
			</AppShell.Header>

			<AppShell.Navbar p="sm">
				<AppShell.Section grow component={ScrollArea}>
					{NAV_GROUPS.map((group) => {
						const items = group.items.filter(
							(item) => !item.visible || item.visible(user)
						);
						if (items.length === 0) return null;

						return (
							<div key={group.title}>
								<Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" py="xs">
									{group.title}
								</Text>
								{items.map((item) => (
									<NavLink
										key={item.href}
										component={Link}
										href={item.href}
										label={item.label}
										active={pathname === item.href}
										onClick={close}
									/>
								))}
							</div>
						);
					})}
				</AppShell.Section>

				<AppShell.Section>
					<Button variant="subtle" color="red" fullWidth onClick={handleLogout}>
						Выйти
					</Button>
				</AppShell.Section>
			</AppShell.Navbar>

			<AppShell.Main>{children}</AppShell.Main>
		</AppShell>
	);
}
