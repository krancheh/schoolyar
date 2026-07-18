import { NextResponse } from "next/server";
import { parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateAcademicYearInput,
	createAcademicYear,
	listAcademicYears,
} from "@entities/academic-year/service";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	return NextResponse.json({ academicYears: await listAcademicYears() });
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateAcademicYearInput>(request);

	try {
		const academicYear = await createAcademicYear(body ?? {});
		return NextResponse.json({ academicYear }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
