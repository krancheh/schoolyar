import { NextResponse } from "next/server";
import {
	jsonError,
	parseDate,
	parseId,
	serviceErrorResponse,
} from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";
import { attendanceReport } from "@entities/report/service";

// Отчёт по посещаемости класса за период.
export async function GET(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const classId = parseId(searchParams.get("classId"));
	if (!classId) return jsonError("classId query parameter is required");

	try {
		return NextResponse.json(
			await attendanceReport(classId, {
				from: parseDate(searchParams.get("from")) ?? undefined,
				to: parseDate(searchParams.get("to")) ?? undefined,
			})
		);
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
