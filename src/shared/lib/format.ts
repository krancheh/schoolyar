// Даты уроков/периодов хранятся как @db.Date (полночь UTC), поэтому
// форматируем всегда в UTC, чтобы не уехать на день из-за таймзоны.
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: "UTC",
});

export function formatDate(date: Date | null | undefined): string {
	return date ? dateFormat.format(date) : "—";
}

// Значение для <input type="date"> (YYYY-MM-DD, UTC).
export function formatDateInput(date: Date | null | undefined): string | null {
	return date ? date.toISOString().slice(0, 10) : null;
}

const dayTitleFormat = new Intl.DateTimeFormat("ru-RU", {
	weekday: "long",
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: "UTC",
});

// «Пятница, 19.07.2026»
export function formatDayTitle(date: Date): string {
	const formatted = dayTitleFormat.format(date);
	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

// 1 = понедельник … 7 = воскресенье (как ScheduleSlot.dayOfWeek)
export const DAY_NAMES: Record<number, string> = {
	1: "Понедельник",
	2: "Вторник",
	3: "Среда",
	4: "Четверг",
	5: "Пятница",
	6: "Суббота",
	7: "Воскресенье",
};

export const DAY_NAMES_SHORT: Record<number, string> = {
	1: "Пн",
	2: "Вт",
	3: "Ср",
	4: "Чт",
	5: "Пт",
	6: "Сб",
	7: "Вс",
};
