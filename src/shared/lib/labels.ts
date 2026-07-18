import { EmployeeRole, TermType } from "@prisma/client";

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
	TEACHER: "Учитель",
	HEAD_TEACHER: "Завуч",
	DIRECTOR: "Директор",
	ADMIN: "Администратор",
};

export const TERM_TYPE_LABELS: Record<TermType, string> = {
	QUARTER: "четверть",
	TRIMESTER: "триместр",
	SEMESTER: "семестр",
};

export function termLabel(term: { type: TermType; number: number }): string {
	return `${term.number}-я ${TERM_TYPE_LABELS[term.type]}`;
}
