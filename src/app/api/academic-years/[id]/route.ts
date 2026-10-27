import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import {
	UpdateAcademicYearInput,
	deleteAcademicYear,
	updateAcademicYear,
} from "@entities/academic-year/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/academic-years/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const yearId = Number(id);
	if (!Number.isInteger(yearId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateAcademicYearInput>(request);

	try {
		const academicYear = await updateAcademicYear(yearId, body ?? {});
		return NextResponse.json({ academicYear });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/academic-years/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const yearId = Number(id);
	if (!Number.isInteger(yearId)) return jsonError("Invalid id");

	try {
		await deleteAcademicYear(yearId);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
