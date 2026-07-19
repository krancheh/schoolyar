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
