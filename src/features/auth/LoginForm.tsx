"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Alert,
	Anchor,
	Button,
	Center,
	Paper,
	PasswordInput,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";

export function LoginForm() {
	const router = useRouter();
	const [login, setLogin] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ login, password }),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setError(json?.error ?? "Не удалось войти");
				return;
			}

			router.push("/");
			router.refresh();
		} catch {
			setError("Сервер недоступен, попробуйте ещё раз");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Center mih="100vh" p="md">
			<Paper withBorder shadow="sm" p="xl" radius="md" w={400}>
				<form onSubmit={handleSubmit}>
					<Stack>
						<Title order={2} ta="center">
							Вход
						</Title>

						{error && (
							<Alert color="red" variant="light">
								{error}
							</Alert>
						)}

						<TextInput
							label="Логин"
							value={login}
							onChange={(event) => setLogin(event.currentTarget.value)}
							required
							autoComplete="username"
						/>
						<PasswordInput
							label="Пароль"
							value={password}
							onChange={(event) => setPassword(event.currentTarget.value)}
							required
							autoComplete="current-password"
						/>

						<Button type="submit" loading={loading} fullWidth>
							Войти
						</Button>

						<Text size="sm" ta="center" c="dimmed">
							Нет учётной записи?{" "}
							<Anchor component={Link} href="/register" size="sm">
								Регистрация
							</Anchor>
						</Text>
					</Stack>
				</form>
			</Paper>
		</Center>
	);
}
