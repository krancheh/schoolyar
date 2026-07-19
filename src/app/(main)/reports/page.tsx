import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	Badge,
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
import { termLabel } from "@shared/lib/labels";
import { listTerms } from "@entities/term/service";
import { journalCompletionReport } from "@entities/report/service";

export const metadata: Metadata = { title: "Отчёты — Школьный портал" };

export default async function ReportsPage() {
	const user = await getAuthUser();
	if (!user?.employee) redirect("/");

	const terms = await listTerms();
	// Текущий период (сегодня внутри границ), иначе — самый свежий.
	const now = new Date();
	const term = terms.find((t) => t.startDate <= now && now <= t.endDate) ?? terms[0];

	if (!term) {
		return (
			<Stack gap="xs">
				<Title order={2}>Отчёты</Title>
				<Text c="dimmed">Отчёты появятся, когда будут заведены учебные периоды.</Text>
			</Stack>
		);
	}

	const report = await journalCompletionReport(term.id);

	return (
		<Stack gap="md">
			<Title order={2}>Отчёты</Title>
			<Title order={4}>
				Заполнение журнала — {termLabel(term)} ({term.academicYear.name})
			</Title>
			<Text size="sm" c="dimmed">
				Учтены уроки по расписанию до {formatDate(report.countedUntil)}. Отчёты по
				посещаемости и успеваемости строятся по классу — появятся здесь после выбора класса.
			</Text>
			{report.rows.length === 0 ? (
				<Text c="dimmed">В этом периоде нет расписания — считать пока нечего.</Text>
			) : (
				<TableScrollContainer minWidth={760}>
					<Table striped highlightOnHover withTableBorder>
						<TableThead>
							<TableTr>
								<TableTh>Класс</TableTh>
								<TableTh>Предмет</TableTh>
								<TableTh>Учитель</TableTh>
								<TableTh ta="center">Ожидалось уроков</TableTh>
								<TableTh ta="center">Записано</TableTh>
								<TableTh ta="center">С темой</TableTh>
								<TableTh ta="center">С д/з</TableTh>
								<TableTh ta="center">Заполнено</TableTh>
							</TableTr>
						</TableThead>
						<TableTbody>
							{report.rows.map((row) => (
								<TableTr key={`${row.class.id}-${row.subject.id}`}>
									<TableTd>{row.class.name}</TableTd>
									<TableTd>{row.subject.name}</TableTd>
									<TableTd>{row.teacher.fullName}</TableTd>
									<TableTd ta="center">{row.expectedLessons}</TableTd>
									<TableTd ta="center">{row.recordedLessons}</TableTd>
									<TableTd ta="center">{row.withTopic}</TableTd>
									<TableTd ta="center">{row.withHomework}</TableTd>
									<TableTd ta="center">
										{row.completionPercent != null ? (
											<Badge
												variant="light"
												color={
													row.completionPercent >= 80
														? "green"
														: row.completionPercent >= 50
															? "yellow"
															: "red"
												}
											>
												{row.completionPercent}%
											</Badge>
										) : (
											"—"
										)}
									</TableTd>
								</TableTr>
							))}
						</TableTbody>
					</Table>
				</TableScrollContainer>
			)}
		</Stack>
	);
}
