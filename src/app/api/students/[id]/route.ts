import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { UpdateStudentInput, deleteStudent, updateStudent } from "@entities/student/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/students/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const studentId = Number(id);
	if (!Number.isInteger(studentId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateStudentInput>(request);

	try {
		const student = await updateStudent(studentId, body ?? {});
		return NextResponse.json({ student });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/students/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const studentId = Number(id);
	if (!Number.isInteger(studentId)) return jsonError("Invalid id");

	try {
		await deleteStudent(studentId);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
