import { NextResponse } from "next/server";
import { parseBody, parseId, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import { CreateTermInput, createTerm, listTerms } from "@entities/term/service";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const academicYearId = parseId(searchParams.get("academicYearId"));

	return NextResponse.json({
		terms: await listTerms({ academicYearId: academicYearId ?? undefined }),
	});
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateTermInput>(request);

	try {
		const term = await createTerm(body ?? {});
		return NextResponse.json({ term }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
