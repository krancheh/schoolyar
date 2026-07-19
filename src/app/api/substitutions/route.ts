import { NextResponse } from "next/server";
import { parseBody, parseDate, parseId, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateSubstitutionInput,
	createSubstitution,
	listSubstitutions,
} from "@entities/substitution/service";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);

	return NextResponse.json({
		substitutions: await listSubstitutions({
			from: parseDate(searchParams.get("from")) ?? undefined,
			to: parseDate(searchParams.get("to")) ?? undefined,
			teacherId: parseId(searchParams.get("teacherId")) ?? undefined,
		}),
	});
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateSubstitutionInput>(request);

	try {
		const substitution = await createSubstitution(body ?? {});
		return NextResponse.json({ substitution }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
