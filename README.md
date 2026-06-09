# 💰 Трекер личных финансов

Учебный проект OTUS. Full-stack приложение для управления личными финансами.

## Стек

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + Recharts
- **Backend:** Express + TypeScript + Prisma ORM
- **База данных:** PostgreSQL 15
- **Инфраструктура:** Docker + docker-compose

## Возможности

- Учёт доходов и расходов с категориями
- Бюджеты с прогресс-барами и предупреждениями
- Повторяющиеся транзакции (зарплата, подписки)
- Дашборд с графиками (линейный + круговой)
- Импорт/экспорт CSV
- Swagger API документация

## Запуск

```bash
docker-compose up -d
```

Открыть: http://localhost:3000

**Тестовые аккаунты:**
| Email | Пароль |
|-------|--------|
| alice@finance.demo | password123 |
| family@finance.demo | password123 |

> Seed-данные загружаются автоматически при первом запуске

## Разработка

```bash
# Backend тесты
cd backend && npm test

# Frontend тесты
cd frontend && npm test
```

## API документация

Swagger UI: http://localhost:4000/api-docs

## Структура проекта

```
otus-ai-project/
├── backend/          # Express API
│   ├── src/
│   │   ├── routes/   # API роуты
│   │   ├── middleware/
│   │   ├── jobs/     # node-cron задачи
│   │   └── seed/     # seed данные
│   ├── prisma/       # схема БД и миграции
│   └── tests/        # Jest тесты
├── frontend/         # Next.js приложение
│   └── app/
│       ├── (auth)/   # логин, регистрация
│       └── (dashboard)/ # основные страницы
├── pgadmin/          # конфигурация pgAdmin
└── docker-compose.yml
```
