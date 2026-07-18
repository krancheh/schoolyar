import { NextResponse } from "next/server";
import { EmployeeRole, Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const employees = await prisma.employee.findMany({
		orderBy: { fullName: "asc" },
	});

	return NextResponse.json({ employees });
}

type CreateEmployeeBody = {
	fullName?: string;
	role?: EmployeeRole;
	email?: string;
	phone?: string;
};

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateEmployeeBody>(request);

	if (!body?.fullName?.trim()) {
		return jsonError("fullName is required");
	}

	if (body.role && !Object.values(EmployeeRole).includes(body.role)) {
		return jsonError(
			`role must be one of: ${Object.values(EmployeeRole).join(", ")}`
		);
	}

	try {
		const employee = await prisma.employee.create({
			data: {
				fullName: body.fullName.trim(),
				role: body.role,
				email: body.email,
				phone: body.phone,
			},
		});

		return NextResponse.json({ employee }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return jsonError("Employee with this email already exists", 409);
		}
		throw error;
	}
}
