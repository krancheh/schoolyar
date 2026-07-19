import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	Stack,
	Table,
	TableScrollContainer,
	TableTbody,
	TableTd,
	TableTh,
	TableThead,
	TableTr,
	Text,
	Title,
} from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { formatDate } from "@shared/lib/format";
import { getClass } from "@entities/class/service";

export const metadata: Metadata = { title: "Мой класс — Школьный портал" };

export default async function MyClassPage() {
	const user = await getAuthUser();
	if (!user?.student) redirect("/");

	if (!user.student.classId) {
		return (
			<Stack gap="xs">
				<Title order={2}>Мой класс</Title>
				<Text c="dimmed">Вы пока не зачислены в класс.</Text>
			</Stack>
		);
	}

	const cls = await getClass(user.student.classId);

	return (
		<Stack gap="md">
			<Title order={2}>
				Мой класс — {cls.name} ({cls.academicYear.name})
			</Title>
			<Text c="dimmed">
				Классный руководитель: {cls.homeroomTeacher?.fullName ?? "не назначен"}
			</Text>
			<TableScrollContainer minWidth={480}>
				<Table striped highlightOnHover withTableBorder>
					<TableThead>
						<TableTr>
							<TableTh>№</TableTh>
							<TableTh>ФИО</TableTh>
							<TableTh>Дата рождения</TableTh>
						</TableTr>
					</TableThead>
					<TableTbody>
						{cls.students.map((student, index) => (
							<TableTr key={student.id}>
								<TableTd>{index + 1}</TableTd>
								<TableTd>{student.fullName}</TableTd>
								<TableTd>{formatDate(student.birthDate)}</TableTd>
							</TableTr>
						))}
					</TableTbody>
				</Table>
			</TableScrollContainer>
		</Stack>
	);
}
