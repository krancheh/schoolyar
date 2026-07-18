# Архитектура базы данных — школьный сервис

СУБД: **PostgreSQL**, ORM: **Prisma 7**. Схема: `prisma/schema.prisma`.

## Обзор

Сервис покрывает функции внутришкольного учёта:

| # | Функция | Таблицы |
|---|---------|---------|
| 1 | Аутентификация и доступ | `User`, `Session` |
| 2 | Создать сотрудника | `Employee` |
| 3 | Создать ученика | `Student` |
| 4 | Журнал (дата, тема, д/з, средний балл) | `Lesson`, `Grade` |
| 5 | Отчёты (посещаемость, успеваемость, заполнение журнала) | `Attendance`, `Grade`, `Lesson`, `ScheduleSlot` (агрегируются на лету) |
| 6 | Классы | `Class` |
| 7 | Расписание | `ScheduleSlot` |
| 8 | Замены | `Substitution` |
| 9 | Период обучения | `AcademicYear` |
| 10 | Четверти, семестры | `Term` |
| 11 | Предметы | `Subject` |

## Слои

Бизнес-логика вынесена в сервисный слой (`src/entities/*/service.ts`):
Prisma-запросы, доменная валидация и маппинг ошибок БД. При ошибке сервис
кидает `ServiceError(message, status)` из `@shared/lib/api`.

Потребители сервисов:

- **Серверные компоненты (SSR)** и Server Actions зовут сервисы напрямую —
  без HTTP-запросов к собственному API (антипаттерн в Next.js: лишний хоп,
  ручной проброс cookie, нет типизации). Пример: `src/app/page.tsx`.
- **REST-роуты** (`src/app/api/**`) — тонкий фасад над сервисами для внешних
  клиентов и клиентских форм: auth-guard, разбор HTTP-входа,
  `ServiceError → jsonError` через `serviceErrorResponse`.

```
страницы (RSC), server actions ─┐
                                ├─> src/entities/*/service.ts ──> Prisma ──> PostgreSQL
клиенты (fetch) ─> src/app/api ─┘
```

## Сущности

### User — учётная запись (функция 1)

Учётная запись для входа. Может быть привязана к сотруднику **или** ученику
(не к обоим сразу); учётка без привязки — «просто пользователь» без прав.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| fullName | String | ФИО |
| login | String unique | логин |
| passwordHash | String | scrypt-хэш (`scrypt:<salt>:<hash>`), в БД — колонка `password` |
| employeeId | Int? unique FK → Employee | привязка к сотруднику |
| studentId | Int? unique FK → Student | привязка к ученику |

Пароли хранятся только в виде scrypt-хэша со случайной солью.

### Session — сессия

Вход выдаёт opaque-токен в httpOnly-cookie `session` (30 дней). В БД хранится
**sha256-хэш** токена — утечка таблицы не даёт рабочих токенов.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| tokenHash | String unique | sha256 от токена |
| userId | FK → User (cascade) | |
| expiresAt | DateTime | срок действия |

### Модель доступа

Роль выводится из привязки учётки, отдельного поля роли у `User` нет:

| Уровень | Кто | Что разрешено |
|---------|-----|---------------|
| авторизованный | любая учётка | чтение справочников, расписания, журнала |
| сотрудник | учётка с `employeeId` | + ведение журнала, оценки, посещаемость, отчёты |
| менеджер | сотрудник с ролью ADMIN / DIRECTOR / HEAD_TEACHER | + создание сотрудников, учеников, классов, предметов, периодов, расписания, замен; регистрация учёток |

**Bootstrap**: пока в системе нет ни одной учётки менеджера,
`POST /api/auth/register` доступен без авторизации и создаёт первого
администратора (пользователь + сотрудник с ролью ADMIN).

### Employee — сотрудник (функция 2)

Учителя и административный персонал.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| fullName | String | ФИО |
| role | enum `EmployeeRole` | TEACHER / HEAD_TEACHER / DIRECTOR / ADMIN |
| email | String? unique | |
| phone | String? | |
| isActive | Boolean | работает ли сейчас |

Связи: классное руководство (`Class.homeroomTeacherId`), слоты расписания, проведённые уроки, замены.

### Student — ученик (функция 3)

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| fullName | String | ФИО |
| birthDate | DateTime? | дата рождения |
| classId | Int? FK → Class | класс, в котором учится |
| enrolledAt | DateTime | дата зачисления |
| isActive | Boolean | не отчислен |

### AcademicYear — период обучения (функция 9)

Учебный год, например «2025/2026».

| Поле | Тип |
|------|-----|
| id | Int PK |
| name | String unique («2025/2026») |
| startDate / endDate | DateTime |

### Term — четверть / семестр (функция 10)

Деление учебного года. Тип задаётся enum-ом, поэтому одна таблица покрывает и четверти, и семестры (и триместры).

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| academicYearId | FK → AcademicYear | |
| type | enum `TermType` | QUARTER / TRIMESTER / SEMESTER |
| number | Int | номер внутри года (1-я четверть, 2-й семестр…) |
| startDate / endDate | DateTime | границы периода |

Уникальность: `(academicYearId, type, number)`.

### Class — класс (функция 6)

Класс привязан к учебному году: «5А» 2025/2026 и «5А» 2026/2027 — разные записи.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| name | String | «5А», «11Б» |
| academicYearId | FK → AcademicYear | |
| homeroomTeacherId | Int? FK → Employee | классный руководитель |

Уникальность: `(name, academicYearId)`.

### Subject — предмет (функция 11)

| Поле | Тип |
|------|-----|
| id | Int PK |
| name | String unique («Алгебра», «Физика») |

### ScheduleSlot — ячейка расписания (функция 7)

Регулярное расписание: «у 5А по вторникам 3-м уроком алгебра у Ивановой в каб. 204». Привязано к четверти/семестру — расписание может меняться между периодами.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| termId | FK → Term | в каком периоде действует |
| classId | FK → Class | |
| subjectId | FK → Subject | |
| teacherId | FK → Employee | |
| dayOfWeek | Int | 1 = понедельник … 7 = воскресенье |
| lessonNumber | Int | порядковый номер урока в дне |
| room | String? | кабинет |

Уникальность: `(termId, classId, dayOfWeek, lessonNumber)` — у класса не может быть двух уроков одновременно.

### Substitution — замена (функция 8)

Разовая замена учителя в конкретную дату для конкретной ячейки расписания.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| scheduleSlotId | FK → ScheduleSlot | какой урок заменяется |
| date | DateTime (date) | дата замены |
| substituteTeacherId | FK → Employee | кто заменяет |
| reason | String? | причина (болезнь, командировка…) |

Уникальность: `(scheduleSlotId, date)`.

### Lesson — запись журнала (функция 4)

Фактически проведённый урок = строка журнала: дата, тема, домашнее задание. **Средний балл не хранится** — считается агрегацией по `Grade` (см. отчёты), чтобы не денормализовывать данные.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| date | DateTime (date) | дата урока |
| classId | FK → Class | |
| subjectId | FK → Subject | |
| teacherId | FK → Employee | кто фактически провёл (с учётом замены) |
| scheduleSlotId | Int? FK → ScheduleSlot | ячейка расписания, по которой проведён |
| topic | String? | тема урока |
| homework | String? | домашнее задание |

### Grade — оценка

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| lessonId | FK → Lesson | |
| studentId | FK → Student | |
| value | Int | 1–5 |
| comment | String? | |

Уникальность: `(lessonId, studentId)` — одна оценка за урок.

### Attendance — посещаемость

| Поле | Тип | Описание |
|------|-----|----------|
| id | Int PK | |
| lessonId | FK → Lesson | |
| studentId | FK → Student | |
| status | enum `AttendanceStatus` | PRESENT / LATE / ABSENT_VALID (уваж.) / ABSENT_INVALID (неуваж.) / SICK |

Уникальность: `(lessonId, studentId)`.

## Отчёты (функция 5)

Отчёты не хранятся в БД — вычисляются агрегирующими запросами:

- **Посещаемость** (`/api/reports/attendance`) — по классу за период: для каждого ученика доля `PRESENT`/`LATE` от всех отметок, разбивка по статусам.
- **Успеваемость** (`/api/reports/performance`) — средний балл ученика по каждому предмету и общий средний балл за период (`AVG(Grade.value)` по урокам периода).
- **Заполнение журнала** (`/api/reports/journal-completion`) — по расписанию вычисляется ожидаемое число уроков за период (ячейки расписания × подходящие даты), сравнивается с фактическими записями `Lesson` и долей записей с заполненной темой/д/з.

## Журнал: средний балл

`GET /api/journal` возвращает для каждой записи `дата, тема, д/з` и `averageGrade` — `AVG(value)` по оценкам урока, посчитанный запросом с группировкой (без хранения в таблице).

## API

| Метод и путь | Назначение |
|--------------|-----------|
| `POST /api/auth/register` | регистрация (bootstrap первого админа — без авторизации, дальше — только менеджер) |
| `POST /api/auth/login` | вход, ставит httpOnly-cookie `session` |
| `POST /api/auth/logout` | выход, удаляет сессию |
| `GET /api/auth/me` | текущий пользователь |
| `GET /api/users` | последние учётки (менеджер) |
| `GET/POST /api/employees` | список / создание сотрудника |
| `GET/POST /api/students` | список / создание ученика |
| `GET/POST /api/classes` | классы |
| `GET/POST /api/subjects` | предметы |
| `GET/POST /api/academic-years` | периоды обучения (с вложенными четвертями) |
| `GET/POST /api/terms` | четверти / семестры |
| `GET/POST /api/schedule` | расписание (фильтры: classId, termId, teacherId) |
| `GET/POST /api/substitutions` | замены (фильтры: дата, учитель) |
| `GET/POST /api/journal` | журнал: записи с датой, темой, д/з и средним баллом; создание записи |
| `GET/PATCH /api/journal/{id}` | одна запись (с оценками и посещаемостью) / правка темы и д/з |
| `PUT /api/journal/{id}/grades` | выставление оценок за урок |
| `PUT /api/journal/{id}/attendance` | отметка посещаемости за урок |
| `GET /api/reports/attendance` | отчёт по посещаемости |
| `GET /api/reports/performance` | отчёт по успеваемости |
| `GET /api/reports/journal-completion` | отчёт по заполнению журнала |
