import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";

export async function GET() {
	const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

	return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
	const body = await parseBody<{ name?: string }>(request);

	if (!body?.name?.trim()) return jsonError("name is required");

	try {
		const subject = await prisma.subject.create({
			data: { name: body.name.trim() },
		});

		return NextResponse.json({ subject }, { status: 201 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return jsonError("Subject with this name already exists", 409);
		}
		throw error;
	}
}
