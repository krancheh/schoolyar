import type { Metadata } from "next";
import { Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { getAuthUser } from "@shared/lib/auth";
import { DAY_NAMES } from "@shared/lib/format";
import { termLabel } from "@shared/lib/labels";
import { listScheduleSlots } from "@entities/schedule/service";

export const metadata: Metadata = { title: "Расписание — Школьный портал" };

export default async function SchedulePage() {
	const user = await getAuthUser();
	// Ученик видит расписание своего класса, сотрудники — всё.
	const slots = await listScheduleSlots(
		user?.student?.classId ? { classId: user.student.classId } : {}
	);

	return (
		<Stack gap="md">
			<Title order={2}>Расписание</Title>
			{slots.length === 0 ? (
				<Text c="dimmed">Расписание пока не заполнено.</Text>
			) : (
				<TableScrollContainer minWidth={760}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>День</TableTh>
								<TableTh ta="center">Урок</TableTh>
								<TableTh>Класс</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh>Учитель</TableTh>
								<TableTh>Кабинет</TableTh>
								<TableTh>Период</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{slots.map((slot) => (
								<TableTr key={slot.id}>
									<TableTd>{DAY_NAMES[slot.dayOfWeek]}</TableTd>
									<TableTd ta="center">{slot.lessonNumber}</TableTd>
									<TableTd>{slot.class.name}</TableTd>
									<TableTd>{slot.subject.name}</TableTd>
									<TableTd>{slot.teacher.fullName}</TableTd>
									<TableTd>{slot.room ?? "—"}</TableTd>
									<TableTd>{termLabel(slot.term)}</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
