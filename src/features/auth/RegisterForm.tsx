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

type RegisterFormProps = {
	// Первая регистрация: админов ещё нет, форма создаст администратора.
	bootstrap: boolean;
	// Текущий пользователь — менеджер и может создавать учётные записи.
	isManager: boolean;
};

export function RegisterForm({ bootstrap, isManager }: RegisterFormProps) {
	const router = useRouter();
	const [fullName, setFullName] = useState("");
	const [login, setLogin] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const canRegister = bootstrap || isManager;

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setSuccess(null);

		if (password.length < 8) {
			setError("Пароль должен быть не короче 8 символов");
			return;
		}
		if (password !== confirm) {
			setError("Пароли не совпадают");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fullName, login, password }),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setError(json?.error ?? "Не удалось зарегистрироваться");
				return;
			}

			if (json?.bootstrap) {
				// Первый админ сразу авторизован — уходим на главную.
				router.push("/");
				router.refresh();
				return;
			}

			setSuccess(`Учётная запись «${json?.user?.login}» создана`);
			setFullName("");
			setLogin("");
			setPassword("");
			setConfirm("");
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
							Регистрация
						</Title>

						{bootstrap && (
							<Alert color="blue" variant="light">
								Первый пользователь станет администратором системы.
							</Alert>
						)}
						{!canRegister && (
							<Alert color="yellow" variant="light">
								Учётные записи создаёт администрация школы. Если у вас нет учётной
								записи — обратитесь к администратору.
							</Alert>
						)}

						{error && (
							<Alert color="red" variant="light">
								{error}
							</Alert>
						)}
						{success && (
							<Alert color="green" variant="light">
								{success}
							</Alert>
						)}

						<TextInput
							label="ФИО"
							value={fullName}
							onChange={(event) => setFullName(event.currentTarget.value)}
							required
							disabled={!canRegister}
						/>
						<TextInput
							label="Логин"
							value={login}
							onChange={(event) => setLogin(event.currentTarget.value)}
							required
							autoComplete="username"
							disabled={!canRegister}
						/>
						<PasswordInput
							label="Пароль"
							description="Не короче 8 символов"
							value={password}
							onChange={(event) => setPassword(event.currentTarget.value)}
							required
							autoComplete="new-password"
							disabled={!canRegister}
						/>
						<PasswordInput
							label="Повторите пароль"
							value={confirm}
							onChange={(event) => setConfirm(event.currentTarget.value)}
							required
							autoComplete="new-password"
							disabled={!canRegister}
						/>

						<Button type="submit" loading={loading} fullWidth disabled={!canRegister}>
							Зарегистрироваться
						</Button>

						<Text size="sm" ta="center" c="dimmed">
							Уже есть учётная запись?{" "}
							<Anchor component={Link} href="/login" size="sm">
								Вход
							</Anchor>
						</Text>
					</Stack>
				</form>
			</Paper>
		</Center>
	);
}
