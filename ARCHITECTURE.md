# ARCHITECTURE.md — Трекер личных финансов

## Описание проекта

Full-stack приложение для учёта личных финансов.
Создано в рамках учебного проекта OTUS с использованием AI-инструментов.

---

## Технологический стек

| Слой        | Технология                                             | Почему                                                         |
|-------------|--------------------------------------------------------|----------------------------------------------------------------|
| Frontend    | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | Быстро, адаптивно из коробки, готовые компоненты        |
| Backend     | Node.js + Express + TypeScript + Prisma ORM            | Прозрачная REST-архитектура, Prisma = миграции + типизация     |
| БД          | PostgreSQL 15                                          | Надёжно, JSON-поля для лога изменений                          |
| API docs    | swagger-jsdoc + swagger-ui-express                     | Живая страница /api-docs автоматически из JSDoc                |
| Графики     | Recharts                                               | React-friendly, декларативный API                              |
| Тесты       | Jest + Supertest (backend), Vitest (frontend)          | Стандарт индустрии                                             |
| CI          | GitHub Actions                                         | Lint → Test → Build Docker                                     |
| Docker      | Multi-stage builds + docker-compose.yml                | 3 сервиса: frontend, backend, db                               |
| CSV         | papaparse (frontend) + csv-parser/csv-writer (backend) | Проверенные библиотеки                                         |
| Scheduler   | node-cron                                              | Лёгкий, встраивается в Express, не требует отдельного сервиса  |
| Курсы валют | Статические курсы в seed-данных                        | Простота; живой API усложнит Docker-деплой без ключей          |

---

## Архитектура системы

```
┌─────────────────────────────────────────────────────┐
│                   docker-compose                    │
│                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌────────┐ │
│  │   Frontend   │    │   Backend    │    │   DB   │ │
│  │  Next.js 14  │───▶│   Express    │───▶│  PgSQL │ │
│  │  :3000       │    │  :4000       │    │  :5432 │ │
│  └──────────────┘    └──────┬───────┘    └────────┘ │
│                             │                       │
│                        node-cron                    │
│                    (повторяющиеся                   │
│                      транзакции)                    │
└─────────────────────────────────────────────────────┘
```

Frontend обращается к Backend через REST API.
Backend работает с PostgreSQL через Prisma ORM.
node-cron запускается внутри Backend-процесса.

---

## Структура папок

```
/
├── backend/
│   ├── src/
│   │   ├── routes/        # Express-роуты (transactions, categories, budgets...)
│   │   ├── controllers/   # Логика обработки запросов
│   │   ├── middleware/    # Auth (JWT), валидация, логирование
│   │   ├── jobs/          # node-cron задачи (повторяющиеся транзакции)
│   │   ├── prisma/        # schema.prisma + миграции
│   │   └── seed/          # Seed-данные (200+ транзакций, 2 пользователя)
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── app/               # Next.js App Router (страницы)
│   ├── components/        # UI-компоненты (shadcn/ui + кастомные)
│   ├── lib/               # API-клиент, утилиты
│   └── Dockerfile
│
├── docker-compose.yml
├── .github/workflows/ci.yml
├── README.md
├── ARCHITECTURE.md        # этот файл
└── REPORT.md
```

---

## База данных — ключевые сущности

```
User              — пользователь (email, password hash, base_currency)
Category          — категория (name, icon, color, user_id)
Transaction       — транзакция (amount, date, type, category_id, user_id,
                                currency, exchange_rate, description)
Budget            — бюджет (category_id, month, limit_amount, user_id)
RecurringRule     — правило повтора (user_id, category_id, amount, day_of_month,
                                     next_run_date)
ChangeLog         — лог изменений (entity_type, entity_id, action, user_id,
                                    changed_at, before JSON, after JSON)
Currency          — справочник валют со статическими курсами (code, rate_to_base)
```

---

## API — основные группы эндпоинтов

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/transactions        (фильтры: date, category, amount, page)
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
POST   /api/transactions/import (CSV)
GET    /api/transactions/export (CSV)

GET/POST/PUT/DELETE  /api/categories
GET/POST/PUT/DELETE  /api/budgets
GET/POST/PUT/DELETE  /api/recurring

GET    /api/dashboard           (статистика, топ-5, динамика)
GET    /api/changelog
GET    /api/currencies

GET    /api-docs                (Swagger UI)
```

---

## План разработки

### Фаза 1 — Основа (инфраструктура)
- [ ] Структура папок, git-репозиторий
- [ ] `docker-compose.yml` (3 сервиса)
- [ ] Backend: `package.json`, `tsconfig.json`, базовый Express-сервер
- [ ] Prisma: подключение к PostgreSQL, первая схема
- [ ] Frontend: `create-next-app`, Tailwind, shadcn/ui

### Фаза 2 — Ядро backend
- [ ] Модели БД (все сущности), миграции
- [ ] Auth: регистрация, JWT, middleware
- [ ] CRUD категорий
- [ ] CRUD транзакций + фильтрация + пагинация
- [ ] ChangeLog middleware (автоматическая запись до/после)

### Фаза 3 — Расширенный backend
- [ ] CRUD бюджетов + расчёт прогресса
- [ ] Повторяющиеся транзакции (node-cron)
- [ ] Мультивалютность (Currency справочник, курс при сохранении)
- [ ] CSV импорт и экспорт
- [ ] Swagger документация

### Фаза 4 — Frontend
- [ ] Layout, навигация, тёмная/светлая тема
- [ ] Auth страницы (login, register)
- [ ] Страница транзакций (таблица, фильтры, пагинация)
- [ ] Страница категорий
- [ ] Страница бюджетов (прогресс-бары)
- [ ] Страница повторяющихся транзакций
- [ ] Страница лога изменений

### Фаза 5 — Дашборд
- [ ] Круговая диаграмма расходов по категориям
- [ ] Линейный график динамики за 6 месяцев
- [ ] Топ-5 категорий
- [ ] CSV импорт/экспорт UI (маппинг колонок)

### Фаза 6 — Качество
- [ ] Backend тесты (Jest + Supertest, минимум 10)
- [ ] Frontend тесты (Vitest)
- [ ] GitHub Actions CI (lint → test → build)
- [ ] Seed-данные (200+ транзакций, 12 категорий, 3 бюджета, 2 пользователя)

### Фаза 7 — Финал
- [ ] README.md с инструкцией запуска
- [ ] REPORT.md (история создания, проблемы, AI-промпты)
- [ ] Финальное тестирование `docker compose up` в чистом окружении
