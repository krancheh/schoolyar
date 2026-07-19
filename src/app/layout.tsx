import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from "@mantine/core";
import { RuDatesProvider } from "@shared/ui/RuDatesProvider";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Школьный портал",
	description: "Описание",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="ru"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			{...mantineHtmlProps}
		>
			<head>
				<ColorSchemeScript />
			</head>
			<body>
				<MantineProvider>
					<RuDatesProvider>{children}</RuDatesProvider>
				</MantineProvider>
			</body>
		</html>
	);
}
