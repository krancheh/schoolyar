import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseDate, parseId } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";

export async function GET(request: Request) {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = new URL(request.url);
	const classId = parseId(searchParams.get("classId"));

	const students = await prisma.student.findMany({
		where: classId ? { classId } : undefined,
		include: { class: { select: { id: true, name: true } } },
		orderBy: { fullName: "asc" },
	});

	return NextResponse.json({ students });
}

type CreateStudentBody = {
	fullName?: string;
	birthDate?: string;
	classId?: number;
};

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateStudentBody>(request);

	if (!body?.fullName?.trim()) {
		return jsonError("fullName is required");
	}

	const birthDate = parseDate(body.birthDate);
	if (body.birthDate && !birthDate) {
		return jsonError("birthDate must be a valid date (YYYY-MM-DD)");
	}

	if (body.classId != null) {
		const cls = await prisma.class.findUnique({ where: { id: body.classId } });
		if (!cls) return jsonError(`Class ${body.classId} not found`, 404);
	}

	const student = await prisma.student.create({
		data: {
			fullName: body.fullName.trim(),
			birthDate,
			classId: body.classId,
		},
	});

	return NextResponse.json({ student }, { status: 201 });
}
