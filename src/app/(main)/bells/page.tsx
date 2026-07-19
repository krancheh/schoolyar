import type { Metadata } from "next";
import {
	Group,
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
import { MANAGER_ROLES, getAuthUser } from "@shared/lib/auth";
import { listBells } from "@entities/bell-schedule/service";
import {
	CreateEntityButton,
	EditEntityButton,
	EntityField,
} from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Звонки — Школьный портал" };

const bellFields: EntityField[] = [
	{ name: "lessonNumber", label: "Номер урока", type: "number", required: true, numeric: true },
	{ name: "startTime", label: "Начало", type: "time", required: true },
	{ name: "endTime", label: "Конец", type: "time", required: true },
];

export default async function BellsPage() {
	const user = await getAuthUser();
	const isManager =
		!!user?.employee && MANAGER_ROLES.includes(user.employee.role);

	const bells = await listBells();

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Расписание звонков</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый звонок"
						fields={bellFields}
						url="/api/bells"
					/>
				)}
			</Group>
			{bells.length === 0 ? (
				<Text c="dimmed">Расписание звонков пока не заполнено.</Text>
			) : (
				<TableScrollContainer minWidth={360}>
					<Table striped highlightOnHover withTableBorder maw={480}>
						<TableThead>
							<TableTr>
								<TableTh ta="center" w={80}>
									Урок
								</TableTh>
								<TableTh>Начало</TableTh>
								<TableTh>Конец</TableTh>
								{isManager && <TableTh w={40} />}
							</TableTr>
						</TableThead>
						<TableTbody>
							{bells.map((bell) => (
								<TableTr key={bell.id}>
									<TableTd ta="center">{bell.lessonNumber}</TableTd>
									<TableTd>{bell.startTime}</TableTd>
									<TableTd>{bell.endTime}</TableTd>
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={`Урок ${bell.lessonNumber}`}
												fields={bellFields}
												url={`/api/bells/${bell.id}`}
												initial={{
													lessonNumber: bell.lessonNumber,
													startTime: bell.startTime,
													endTime: bell.endTime,
												}}
											/>
										</TableTd>
									)}
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
