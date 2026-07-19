import { NextResponse } from "next/server";
import { requireManager } from "@shared/lib/auth";
import { listUsers } from "@entities/user/service";

export async function GET() {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	try {
		return NextResponse.json({ users: await listUsers() });
	} catch (error) {
		console.error("Failed to fetch users", error);

		return NextResponse.json(
			{ error: "Unable to fetch users from the database" },
			{ status: 500 },
		);
	}
}
