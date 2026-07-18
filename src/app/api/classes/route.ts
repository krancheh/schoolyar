import { NextResponse } from "next/server";
import { parseBody, parseId, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateClassInput,
	createClass,
	listClasses,
} from "@entities/class/service";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const academicYearId = parseId(searchParams.get("academicYearId"));

	return NextResponse.json({
		classes: await listClasses({ academicYearId: academicYearId ?? undefined }),
	});
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateClassInput>(request);

	try {
		const createdClass = await createClass(body ?? {});
		return NextResponse.json({ class: createdClass }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
