import { NextResponse } from "next/server";
import { parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import { createSubject, listSubjects } from "@entities/subject/service";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	return NextResponse.json({ subjects: await listSubjects() });
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<{ name?: string }>(request);

	try {
		const subject = await createSubject(body ?? {});
		return NextResponse.json({ subject }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
