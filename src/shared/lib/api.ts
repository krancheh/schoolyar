import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
	return NextResponse.json({ error: message }, { status });
}

// Доменная ошибка сервисного слоя: сервисы кидают её вместо возврата
// HTTP-ответов, чтобы их можно было звать и из роутов, и из RSC/actions.
export class ServiceError extends Error {
	constructor(
		message: string,
		public readonly status = 400
	) {
		super(message);
		this.name = "ServiceError";
	}
}

// Для catch-блоков route handlers: ServiceError -> JSON-ответ,
// всё остальное пробрасывается дальше.
export function serviceErrorResponse(error: unknown): NextResponse {
	if (error instanceof ServiceError) {
		return jsonError(error.message, error.status);
	}
	throw error;
}

export async function parseBody<T>(request: Request): Promise<T | null> {
	try {
		return (await request.json()) as T;
	} catch {
		return null;
	}
}

export function parseDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function parseId(value: string | null | undefined): number | null {
	if (!value) return null;
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

// 1 = понедельник … 7 = воскресенье (как в ScheduleSlot.dayOfWeek)
export function isoDayOfWeek(date: Date): number {
	const day = date.getUTCDay();
	return day === 0 ? 7 : day;
}

export function* eachDay(from: Date, to: Date): Generator<Date> {
	const current = new Date(
		Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
	);
	while (current.getTime() <= to.getTime()) {
		yield new Date(current);
		current.setUTCDate(current.getUTCDate() + 1);
	}
}
