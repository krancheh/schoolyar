import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseId } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const academicYearId = parseId(searchParams.get("academicYearId"));

	const classes = await prisma.class.findMany({
		where: academicYearId ? { academicYearId } : undefined,
		include: {
			academicYear: { select: { id: true, name: true } },
			homeroomTeacher: { select: { id: true, fullName: true } },
			_count: { select: { students: true } },
		},
		orderBy: { name: "asc" },
	});

	return NextResponse.json({ classes });
}

type CreateClassBody = {
	name?: string;
	academicYearId?: number;
	homeroomTeacherId?: number;
};

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateClassBody>(request);

	if (!body?.name?.trim()) return jsonError("name is required");
	if (!body.academicYearId) return jsonError("academicYearId is required");

	const year = await prisma.academicYear.findUnique({
		where: { id: body.academicYearId },
	});
	if (!year) {
		return jsonError(`AcademicYear ${body.academicYearId} not found`, 404);
	}

	try {
		const createdClass = await prisma.class.create({
			data: {
				name: body.name.trim(),
				academicYearId: body.academicYearId,
				homeroomTeacherId: body.homeroomTeacherId,
			},
		});

		return NextResponse.json({ class: createdClass }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return jsonError(
				"Class with this name already exists in this academic year",
				409
			);
		}
		throw error;
	}
}
