"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

type DeleteEntityButtonProps = {
	// как запись называется в подтверждении: «Удалить «5А»?»
	name: string;
	url: string;
	// что ещё пропадёт вместе с записью (каскадные удаления)
	description?: string;
};

function TrashIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M3 6h18" />
			<path d="M8 6V4h8v2" />
			<path d="M19 6l-1 14H6L5 6" />
			<path d="M10 11v6" />
			<path d="M14 11v6" />
		</svg>
	);
}

export function DeleteEntityButton({ name, url, description }: DeleteEntityButtonProps) {
	const router = useRouter();
	const [opened, { open, close }] = useDisclosure(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handleClose() {
		if (loading) return;
		setError(null);
		close();
	}

	async function handleDelete() {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch(url, { method: "DELETE" });
			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setError(json?.error ?? "Не удалось удалить");
				return;
			}

			close();
			router.refresh();
		} catch {
			setError("Сервер недоступен, попробуйте ещё раз");
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			<ActionIcon variant="subtle" color="red" onClick={open} aria-label={`Удалить ${name}`}>
				<TrashIcon />
			</ActionIcon>
			<Modal opened={opened} onClose={handleClose} title="Подтверждение удаления" centered>
				<Stack>
					<Text>Удалить «{name}»? Действие нельзя отменить.</Text>
					{description && (
						<Text size="sm" c="dimmed">
							{description}
						</Text>
					)}
					{error && (
						<Alert color="red" variant="light">
							{error}
						</Alert>
					)}
					<Group justify="flex-end">
						<Button variant="default" onClick={handleClose} disabled={loading}>
							Отмена
						</Button>
						<Button color="red" onClick={handleDelete} loading={loading}>
							Удалить
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	);
}
