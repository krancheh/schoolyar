import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { listSubjects } from "@entities/subject/service";
import { CreateEntityButton, EditEntityButton, EntityField } from "@features/crud/EntityForm";

export const metadata: Metadata = { title: "Предметы — Школьный портал" };

const subjectFields: EntityField[] = [{ name: "name", label: "Название", required: true }];

export default async function SubjectsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const isManager = MANAGER_ROLES.includes(user.employee.role);
	const subjects = await listSubjects();

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Title order={2}>Предметы</Title>
				{isManager && (
					<CreateEntityButton
						title="Новый предмет"
						fields={subjectFields}
						url="/api/subjects"
					/>
				)}
			</Group>
			{subjects.length === 0 ? (
				<Text c="dimmed">Предметов пока нет.</Text>
			) : (
				<TableScrollContainer minWidth={320}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh w={60}>№</TableTh>
								<TableTh>Название</TableTh>
								{isManager && <TableTh />}
							</TableTr>
						</TableThead>
						<TableTbody>
							{subjects.map((subject, index) => (
								<TableTr key={subject.id}>
									<TableTd>{index + 1}</TableTd>
									<TableTd>{subject.name}</TableTd>
									{isManager && (
										<TableTd>
											<EditEntityButton
												title={subject.name}
												fields={subjectFields}
												url={`/api/subjects/${subject.id}`}
												initial={{ name: subject.name }}
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
