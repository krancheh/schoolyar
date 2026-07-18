import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseDate } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const academicYears = await prisma.academicYear.findMany({
		include: { terms: { orderBy: { number: "asc" } } },
		orderBy: { startDate: "desc" },
	});

	return NextResponse.json({ academicYears });
}

type CreateAcademicYearBody = {
	name?: string;
	startDate?: string;
	endDate?: string;
};

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateAcademicYearBody>(request);

	if (!body?.name?.trim()) return jsonError("name is required");

	const startDate = parseDate(body.startDate);
	const endDate = parseDate(body.endDate);
	if (!startDate || !endDate) {
		return jsonError("startDate and endDate must be valid dates (YYYY-MM-DD)");
	}
	if (endDate <= startDate) {
		return jsonError("endDate must be after startDate");
	}

	try {
		const academicYear = await prisma.academicYear.create({
			data: { name: body.name.trim(), startDate, endDate },
		});

		return NextResponse.json({ academicYear }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return jsonError("Academic year with this name already exists", 409);
		}
		throw error;
	}
}
