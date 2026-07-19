// Роли для видимости пунктов меню; вычисляются на сервере из AuthUser.
export type NavRole = {
	isStudent: boolean;
	isEmployee: boolean;
	isManager: boolean;
};

export type NavItem = {
	label: string;
	href: string;
	visible?: (role: NavRole) => boolean;
};

export type NavGroup = {
	title: string;
	items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
	{
		// Личный раздел: то, чем пользуются каждый день (в первую очередь ученики).
		title: "Моё",
		items: [
			{ label: "Главная", href: "/" },
			{ label: "Журнал", href: "/journal" },
			{ label: "Мой класс", href: "/my-class", visible: (r) => r.isStudent },
			{ label: "Расписание", href: "/schedule" },
			{ label: "Звонки", href: "/bells" },
			{ label: "Замены", href: "/substitutions" },
		],
	},
	{
		// Общие списки — рабочий раздел сотрудников.
		title: "Общее",
		items: [
			{ label: "Ученики", href: "/students", visible: (r) => r.isEmployee },
			{ label: "Классы", href: "/classes", visible: (r) => r.isEmployee },
			{ label: "Сотрудники", href: "/employees", visible: (r) => r.isEmployee },
			{ label: "Предметы", href: "/subjects", visible: (r) => r.isEmployee },
			{
				label: "Периоды обучения",
				href: "/academic-years",
				visible: (r) => r.isEmployee,
			},
			{ label: "Отчёты", href: "/reports", visible: (r) => r.isEmployee },
			{ label: "Пользователи", href: "/users", visible: (r) => r.isManager },
		],
	},
];
