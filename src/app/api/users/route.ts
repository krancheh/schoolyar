import { NextResponse } from "next/server";
import { prisma } from "@shared/lib/db";
import { requireManager } from "@shared/lib/auth";

export async function GET() {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	try {
		const users = await prisma.user.findMany({
			take: 10,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				fullName: true,
				login: true,
				employeeId: true,
				studentId: true,
				createdAt: true,
			},
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
