import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@shared/lib/auth";
import { LoginForm } from "@features/auth/LoginForm";

export const metadata: Metadata = {
	title: "Вход — Школьный портал",
};

export default async function LoginPage() {
	const user = await getAuthUser();
	if (user) redirect("/");

	return <LoginForm />;
}
