import { NextResponse } from "next/server";
import { jsonError, parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireManager } from "@shared/lib/auth";
import { UpdateEmployeeInput, updateEmployee } from "@entities/employee/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/employees/[id]">) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const { id } = await ctx.params;
	const employeeId = Number(id);
	if (!Number.isInteger(employeeId)) return jsonError("Invalid id");

	const body = await parseBody<UpdateEmployeeInput>(request);

	try {
		const employee = await updateEmployee(employeeId, body ?? {});
		return NextResponse.json({ employee });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
