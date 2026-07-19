import { NextResponse } from "next/server";
import { jsonError, parseId, serviceErrorResponse } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";
import { journalCompletionReport } from "@entities/report/service";

// Отчёт по заполнению журнала: сколько уроков по расписанию должно было
// пройти за период и сколько из них записано в журнал с темой и д/з.
export async function GET(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const termId = parseId(searchParams.get("termId"));
	if (!termId) return jsonError("termId query parameter is required");

	try {
		return NextResponse.json(
			await journalCompletionReport(termId, {
				classId: parseId(searchParams.get("classId")) ?? undefined,
			}),
		);
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
