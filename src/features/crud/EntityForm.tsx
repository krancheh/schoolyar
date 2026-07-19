"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	Alert,
	Button,
	Checkbox,
	Modal,
	PasswordInput,
	Select,
	Stack,
	TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

export type FieldOption = { value: string; label: string };

// Конфиг поля — только сериализуемые данные: собирается на сервере
// (вместе со списками опций из БД) и передаётся в клиентскую форму.
export type EntityField = {
	name: string;
	label: string;
	type?: "text" | "number" | "date" | "password" | "select" | "checkbox" | "hidden";
	required?: boolean;
	// значение отправляется числом (id из селектов, номера)
	numeric?: boolean;
	// при редактировании пустое значение отправляется как null (очистка)
	nullable?: boolean;
	options?: FieldOption[];
	description?: string;
};

export type EntityInitial = Record<string, string | number | boolean | null>;

type FormValues = Record<string, string | boolean>;

function toFormValues(
	fields: EntityField[],
	initial?: EntityInitial
): FormValues {
	const values: FormValues = {};
	for (const field of fields) {
		const raw = initial?.[field.name];
		values[field.name] =
			field.type === "checkbox"
				? !!raw
				: raw === undefined || raw === null
					? ""
					: String(raw);
	}
	return values;
}

type EntityFormModalProps = {
	title: string;
	fields: EntityField[];
	url: string;
	method: "POST" | "PATCH";
	initial?: EntityInitial;
	opened: boolean;
	onClose: () => void;
};

export function EntityFormModal({
	title,
	fields,
	url,
	method,
	initial,
	opened,
	onClose,
}: EntityFormModalProps) {
	const router = useRouter();
	const [values, setValues] = useState<FormValues>(() =>
		toFormValues(fields, initial)
	);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Сброс формы при каждом открытии.
	useEffect(() => {
		if (opened) {
			setValues(toFormValues(fields, initial));
			setError(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [opened]);

	const set = (name: string, value: string | boolean) =>
		setValues((prev) => ({ ...prev, [name]: value }));

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		const payload: Record<string, unknown> = {};
		for (const field of fields) {
			const value = values[field.name];
			if (field.type === "checkbox") {
				payload[field.name] = !!value;
				continue;
			}
			const str = String(value ?? "").trim();
			if (str === "") {
				if (method === "PATCH" && field.nullable) payload[field.name] = null;
				continue;
			}
			payload[field.name] = field.numeric ? Number(str) : str;
		}

		setLoading(true);
		try {
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setError(json?.error ?? "Не удалось сохранить");
				return;
			}

			onClose();
			router.refresh();
		} catch {
			setError("Сервер недоступен, попробуйте ещё раз");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Modal opened={opened} onClose={onClose} title={title} centered>
			<form onSubmit={handleSubmit}>
				<Stack>
					{error && (
						<Alert color="red" variant="light">
							{error}
						</Alert>
					)}

					{fields.map((field) => {
						if (field.type === "hidden") return null;
						if (field.type === "checkbox") {
							return (
								<Checkbox
									key={field.name}
									label={field.label}
									checked={!!values[field.name]}
									onChange={(event) =>
										set(field.name, event.currentTarget.checked)
									}
								/>
							);
						}
						if (field.type === "select") {
							return (
								<Select
									key={field.name}
									label={field.label}
									description={field.description}
									data={field.options ?? []}
									value={String(values[field.name] ?? "") || null}
									onChange={(value) => set(field.name, value ?? "")}
									required={field.required}
									clearable={!field.required}
									searchable
								/>
							);
						}
						if (field.type === "password") {
							return (
								<PasswordInput
									key={field.name}
									label={field.label}
									description={field.description}
									value={String(values[field.name] ?? "")}
									onChange={(event) =>
										set(field.name, event.currentTarget.value)
									}
									required={field.required}
								/>
							);
						}
						return (
							<TextInput
								key={field.name}
								type={field.type ?? "text"}
								label={field.label}
								description={field.description}
								value={String(values[field.name] ?? "")}
								onChange={(event) => set(field.name, event.currentTarget.value)}
								required={field.required}
							/>
						);
					})}

					<Button type="submit" loading={loading}>
						Сохранить
					</Button>
				</Stack>
			</form>
		</Modal>
	);
}

type CreateEntityButtonProps = {
	title: string;
	fields: EntityField[];
	url: string;
	label?: string;
	// предзаполненные значения (в т.ч. для hidden-полей)
	initial?: EntityInitial;
};

export function CreateEntityButton({
	title,
	fields,
	url,
	label = "Добавить",
	initial,
}: CreateEntityButtonProps) {
	const [opened, { open, close }] = useDisclosure(false);

	return (
		<>
			<Button size="sm" onClick={open}>
				{label}
			</Button>
			<EntityFormModal
				title={title}
				fields={fields}
				url={url}
				method="POST"
				initial={initial}
				opened={opened}
				onClose={close}
			/>
		</>
	);
}

type EditEntityButtonProps = {
	title: string;
	fields: EntityField[];
	url: string;
	initial: EntityInitial;
	label?: string;
};

export function EditEntityButton({
	title,
	fields,
	url,
	initial,
	label = "Изменить",
}: EditEntityButtonProps) {
	const [opened, { open, close }] = useDisclosure(false);

	return (
		<>
			<Button variant="subtle" size="compact-sm" onClick={open}>
				{label}
			</Button>
			<EntityFormModal
				title={title}
				fields={fields}
				url={url}
				method="PATCH"
				initial={initial}
				opened={opened}
				onClose={close}
			/>
		</>
	);
}
