import { NextResponse } from "next/server";
import { Prisma, TermType } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseDate, parseId } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const academicYearId = parseId(searchParams.get("academicYearId"));

	const terms = await prisma.term.findMany({
		where: academicYearId ? { academicYearId } : undefined,
		include: { academicYear: { select: { id: true, name: true } } },
		orderBy: [{ academicYearId: "desc" }, { number: "asc" }],
	});

	return NextResponse.json({ terms });
}

type CreateTermBody = {
	academicYearId?: number;
	type?: TermType;
	number?: number;
	startDate?: string;
	endDate?: string;
};

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateTermBody>(request);

	if (!body?.academicYearId) return jsonError("academicYearId is required");
	if (!body.number || body.number < 1) {
		return jsonError("number must be a positive integer");
	}
	if (body.type && !Object.values(TermType).includes(body.type)) {
		return jsonError(
			`type must be one of: ${Object.values(TermType).join(", ")}`
		);
	}

	const startDate = parseDate(body.startDate);
	const endDate = parseDate(body.endDate);
	if (!startDate || !endDate) {
		return jsonError("startDate and endDate must be valid dates (YYYY-MM-DD)");
	}
	if (endDate <= startDate) {
		return jsonError("endDate must be after startDate");
	}

	const year = await prisma.academicYear.findUnique({
		where: { id: body.academicYearId },
	});
	if (!year) {
		return jsonError(`AcademicYear ${body.academicYearId} not found`, 404);
	}

	try {
		const term = await prisma.term.create({
			data: {
				academicYearId: body.academicYearId,
				type: body.type,
				number: body.number,
				startDate,
				endDate,
			},
		});

		return NextResponse.json({ term }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return jsonError(
				"Term with this type and number already exists in this academic year",
				409
			);
		}
		throw error;
	}
}
