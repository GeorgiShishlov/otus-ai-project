# 💰 Трекер личных финансов

Учебный проект OTUS. Full-stack приложение для управления личными финансами, созданное с помощью AI.

## Стек

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + Recharts
- **Backend:** Express + TypeScript + Prisma ORM
- **База данных:** PostgreSQL 15
- **Инфраструктура:** Docker + docker-compose + GitHub Actions CI

## Возможности

- Учёт доходов и расходов с категориями (иконки, цвета)
- Бюджеты с прогресс-барами по категориям
- Повторяющиеся транзакции (зарплата, подписки) — автосоздание по cron
- Дашборд: линейный график за 6 месяцев, круговая диаграмма, топ-5 категорий
- Фильтрация транзакций по дате, категории, сумме, типу
- Импорт CSV с маппингом колонок / экспорт CSV
- Лог изменений с diff до/после
- Мультивалютность
- Swagger API документация
- Адаптивная вёрстка (desktop + mobile)

## Запуск

```bash
git clone https://github.com/GeorgiShishlov/otus-ai-project.git
cd otus-ai-project
docker compose up -d
```

Открыть: http://localhost:3000

> Seed-данные (366 транзакций, 12 категорий, 3 бюджета) загружаются автоматически при первом запуске.

**Тестовые аккаунты:**

| Email | Пароль | Описание |
|-------|--------|----------|
| alice@finance.demo | password123 | Личный бюджет |
| family@finance.demo | password123 | Семейный бюджет |

## Тесты

```bash
# Backend (18 тестов)
cd backend && npm test

# Frontend (4 теста)
cd frontend && npm test
```

## API документация

Swagger UI: http://localhost:4000/api-docs

## pgAdmin — просмотр базы данных

pgAdmin доступен по адресу: http://localhost:5050

**Данные для входа:**
| Поле | Значение |
|------|----------|
| Email | admin@finance.local |
| Пароль | admin |

Подключение к PostgreSQL настроено автоматически — сервер **finance_db** уже появится в списке слева.

Если потребуется пароль к серверу:

| Поле | Значение |
|------|----------|
| Username | finance_user |
| Password | finance_pass |

## Структура проекта

```
otus-ai-project/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # регистрация, логин, /me
│   │   │   ├── transactions.ts  # CRUD + фильтры + пагинация
│   │   │   ├── categories.ts    # CRUD категорий
│   │   │   ├── budgets.ts       # CRUD бюджетов с прогрессом
│   │   │   ├── recurring.ts     # повторяющиеся правила
│   │   │   ├── dashboard.ts     # статистика, графики, топ-5
│   │   │   ├── csv.ts           # импорт и экспорт CSV
│   │   │   ├── changelog.ts     # лог изменений
│   │   │   └── currencies.ts    # справочник валют
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT middleware
│   │   ├── jobs/
│   │   │   └── recurringJob.ts  # cron-задача (00:05 ежедневно)
│   │   ├── seed/
│   │   │   └── index.ts         # идемпотентный seed
│   │   ├── app.ts               # Express + Swagger конфиг
│   │   └── index.ts             # точка входа
│   ├── prisma/
│   │   └── schema.prisma        # схема БД (7 моделей)
│   └── tests/                   # Jest + Supertest (18 тестов)
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # лендинг
│   │   ├── (auth)/
│   │   │   ├── login/           # страница входа
│   │   │   └── register/        # страница регистрации
│   │   └── (dashboard)/
│   │       ├── layout.tsx       # сайдбар + bottom nav
│   │       ├── dashboard/       # графики, топ-5, карточки
│   │       ├── transactions/    # список + фильтры + добавление
│   │       ├── categories/      # CRUD категорий
│   │       ├── budgets/         # бюджеты с прогресс-барами
│   │       ├── recurring/       # повторяющиеся правила
│   │       ├── csv/             # импорт/экспорт CSV
│   │       └── changelog/       # лог изменений
│   ├── lib/
│   │   └── api.ts               # axios-клиент
│   └── __tests__/               # Jest + RTL (4 теста)
├── pgadmin/                     # конфигурация pgAdmin
├── .github/workflows/ci.yml     # CI: тесты + Docker build
├── docker-compose.yml
├── ARCHITECTURE.md
└── REPORT.md
```

## Порты

| Сервис | Адрес |
|--------|-------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Swagger | http://localhost:4000/api-docs |
| pgAdmin | http://localhost:5050 |
| PostgreSQL | localhost:5432 |
