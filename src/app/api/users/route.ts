import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";

export async function GET() {
	try {
		const users = await prisma.user.findMany({
			take: 10,
			orderBy: { createdAt: "desc" },
		});

		return NextResponse.json({ users });
	} catch (error) {
		console.error("Failed to fetch users", error);

		return NextResponse.json(
			{ error: "Unable to fetch users from the database" },
			{ status: 500 }
		);
	}
}
