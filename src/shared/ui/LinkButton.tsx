"use client";

import Link from "next/link";
import { Button, ButtonProps } from "@mantine/core";
import { ReactNode } from "react";

// Кнопка-ссылка для server components: `component={Link}` нельзя передать
// через границу RSC (функция), поэтому связка живёт в клиентском компоненте.
export function LinkButton({
	href,
	children,
	...props
}: ButtonProps & { href: string; children: ReactNode }) {
	return (
		<Button component={Link} href={href} {...props}>
			{children}
		</Button>
	);
}
