import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireEmployee } from "@shared/lib/auth";
import { FinalGradeInput, setTermGrades } from "@entities/journal/service";

// Итоговые оценки за учебный период (upsert по ученик+предмет+период).
export async function PUT(request: Request) {
	const auth = await requireEmployee();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<{
		termId?: number;
		subjectId?: number;
		grades?: FinalGradeInput[];
	}>(request);
	if (!Number.isInteger(body?.termId) || !Number.isInteger(body?.subjectId)) {
		return jsonError("termId and subjectId are required");
	}

	try {
		const grades = await setTermGrades(body!.termId!, body!.subjectId!, body?.grades ?? []);
		return NextResponse.json({ grades });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
