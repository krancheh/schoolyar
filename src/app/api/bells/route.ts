import { NextResponse } from "next/server";
import { parseBody, serviceErrorResponse } from "@shared/lib/api";
import { requireAuth, requireManager } from "@shared/lib/auth";
import {
	CreateBellInput,
	createBell,
	listBells,
} from "@entities/bell-schedule/service";

export async function GET() {
	const auth = await requireAuth();
	if (auth instanceof NextResponse) return auth;

	return NextResponse.json({ bells: await listBells() });
}

export async function POST(request: Request) {
	const auth = await requireManager();
	if (auth instanceof NextResponse) return auth;

	const body = await parseBody<CreateBellInput>(request);

	try {
		const bell = await createBell(body ?? {});
		return NextResponse.json({ bell }, { status: 201 });
	} catch (error) {
		return serviceErrorResponse(error);
	}
}
