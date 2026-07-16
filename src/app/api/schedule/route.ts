import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseId } from "@shared/lib/api";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const classId = parseId(searchParams.get("classId"));
	const termId = parseId(searchParams.get("termId"));
	const teacherId = parseId(searchParams.get("teacherId"));

	const slots = await prisma.scheduleSlot.findMany({
		where: {
			...(classId ? { classId } : {}),
			...(termId ? { termId } : {}),
			...(teacherId ? { teacherId } : {}),
		},
		include: {
			class: { select: { id: true, name: true } },
			subject: { select: { id: true, name: true } },
			teacher: { select: { id: true, fullName: true } },
			term: { select: { id: true, type: true, number: true } },
		},
		orderBy: [{ dayOfWeek: "asc" }, { lessonNumber: "asc" }],
	});

	return NextResponse.json({ slots });
}

type CreateSlotBody = {
	termId?: number;
	classId?: number;
	subjectId?: number;
	teacherId?: number;
	dayOfWeek?: number;
	lessonNumber?: number;
	room?: string;
};

export async function POST(request: Request) {
	const body = await parseBody<CreateSlotBody>(request);

	if (
		!body?.termId ||
		!body.classId ||
		!body.subjectId ||
		!body.teacherId ||
		!body.dayOfWeek ||
		!body.lessonNumber
	) {
		return jsonError(
			"termId, classId, subjectId, teacherId, dayOfWeek and lessonNumber are required"
		);
	}

	if (body.dayOfWeek < 1 || body.dayOfWeek > 7) {
		return jsonError("dayOfWeek must be between 1 (Monday) and 7 (Sunday)");
	}
	if (body.lessonNumber < 1) {
		return jsonError("lessonNumber must be a positive integer");
	}

	try {
		const slot = await prisma.scheduleSlot.create({
			data: {
				termId: body.termId,
				classId: body.classId,
				subjectId: body.subjectId,
				teacherId: body.teacherId,
				dayOfWeek: body.dayOfWeek,
				lessonNumber: body.lessonNumber,
				room: body.room,
			},
		});

		return NextResponse.json({ slot }, { status: 201 });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return jsonError(
					"This class already has a lesson at this time in this term",
					409
				);
			}
			if (error.code === "P2003") {
				return jsonError("Related term, class, subject or teacher not found", 404);
			}
		}
		throw error;
	}
}
