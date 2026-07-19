"use client";

import { DatesProvider } from "@mantine/dates";
import { ReactNode } from "react";
import "dayjs/locale/ru";

// Русская локаль для календарей и единый порядок дней недели.
export function RuDatesProvider({ children }: { children: ReactNode }) {
	return (
		<DatesProvider settings={{ locale: "ru", firstDayOfWeek: 1 }}>
			{children}
		</DatesProvider>
	);
}
