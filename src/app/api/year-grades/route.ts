import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";
import { FinalGradeInput, setYearGrades } from "@entities/journal/service";

// Годовые («итоговые») оценки (upsert по ученик+предмет+учебный год).
export async function PUT(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<{
		academicYearId?: number;
		subjectId?: number;
		grades?: FinalGradeInput[];
	}>(request);
	if (!Number.isInteger(body?.academicYearId) || !Number.isInteger(body?.subjectId)) {
		return jsonError("academicYearId and subjectId are required");
	}

	try {
		const grades = await setYearGrades(
			body!.academicYearId!,
			body!.subjectId!,
			body?.grades ?? [],
		);
		return NextResponse.json({ grades });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
