import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@shared/lib/db";
import { jsonError, parseBody } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

	return NextResponse.json({ subjects });
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

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
