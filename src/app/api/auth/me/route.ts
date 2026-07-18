import { NextResponse } from "next/server";
import { requireAuth } from "@shared/lib/auth";

export async function GET() {
	const user = await requireAuth();
	if (user instanceof NextResponse) return user;

	return NextResponse.json({ user });
}
