import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody, parseDate, parseId, isoDayOfWeek } from "@shared/lib/api";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const from = parseDate(searchParams.get("from"));
	const to = parseDate(searchParams.get("to"));
	const teacherId = parseId(searchParams.get("teacherId"));

	const substitutions = await prisma.substitution.findMany({
		where: {
			...(from || to
				? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
				: {}),
			...(teacherId ? { substituteTeacherId: teacherId } : {}),
		},
		include: {
			substituteTeacher: { select: { id: true, fullName: true } },
			scheduleSlot: {
				include: {
					class: { select: { id: true, name: true } },
					subject: { select: { id: true, name: true } },
					teacher: { select: { id: true, fullName: true } },
				},
			},
		},
		orderBy: { date: "asc" },
	});

	return NextResponse.json({ substitutions });
}

type CreateSubstitutionBody = {
	scheduleSlotId?: number;
	date?: string;
	substituteTeacherId?: number;
	reason?: string;
};

export async function POST(request: Request) {
	const body = await parseBody<CreateSubstitutionBody>(request);

	if (!body?.scheduleSlotId || !body.substituteTeacherId) {
		return jsonError("scheduleSlotId and substituteTeacherId are required");
	}

	const date = parseDate(body.date);
	if (!date) return jsonError("date must be a valid date (YYYY-MM-DD)");

	const slot = await prisma.scheduleSlot.findUnique({
		where: { id: body.scheduleSlotId },
	});
	if (!slot) {
		return jsonError(`ScheduleSlot ${body.scheduleSlotId} not found`, 404);
	}
	if (isoDayOfWeek(date) !== slot.dayOfWeek) {
		return jsonError(
			`Date does not match the slot's day of week (${slot.dayOfWeek})`
		);
	}
	if (slot.teacherId === body.substituteTeacherId) {
		return jsonError("Substitute teacher is the same as the scheduled teacher");
	}

	try {
		const substitution = await prisma.substitution.create({
			data: {
				scheduleSlotId: body.scheduleSlotId,
				date,
				substituteTeacherId: body.substituteTeacherId,
				reason: body.reason,
			},
		});

		return NextResponse.json({ substitution }, { status: 201 });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return jsonError(
					"Substitution for this slot and date already exists",
					409
				);
			}
			if (error.code === "P2003") {
				return jsonError("Substitute teacher not found", 404);
			}
		}
		throw error;
	}
}
