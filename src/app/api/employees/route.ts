import { NextResponse } from "next/server";
import { parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateEmployeeInput,
	createEmployee,
	listEmployees,
} from "@entities/employee/service";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	return NextResponse.json({ employees: await listEmployees() });
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateEmployeeInput>(request);

	try {
		const employee = await createEmployee(body ?? {});
		return NextResponse.json({ employee }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
