# REPORT.md — Трекер личных финансов

## О проекте

Учебный проект OTUS. Full-stack приложение для отслеживания личных финансов,
созданное с помощью AI (Claude). Стек: Next.js 14 + Express + TypeScript +
Prisma + PostgreSQL + Docker.

---

## История создания

### Сессия 1 — Выбор темы и архитектура (2026-06-07)

Тема не была выбрана заранее — решение приняли в начале сессии.
Рассматривали несколько вариантов: трекер задач, блог, интернет-магазин.
Остановились на трекере финансов как наиболее показательном с точки зрения
работы с данными (агрегации, графики, фильтры, периодические задачи).

Сразу спроектировали полную схему БД: 7 моделей (User, Category, Transaction,
Budget, RecurringRule, ChangeLog, Currency). Это позволило не переделывать
миграции позже.

**Фаза 1 — Инфраструктура:**
Создали структуру монорепозитория: `/backend` и `/frontend` в одном репозитории.
docker-compose.yml с тремя сервисами (db, backend, frontend) с healthcheck для
PostgreSQL — чтобы backend не стартовал раньше базы.

**Фаза 2 — Ядро backend:**
JWT-аутентификация, CRUD для категорий и транзакций. Транзакции сразу с
пагинацией и фильтрами по типу (INCOME/EXPENSE). При каждом создании/изменении
транзакции пишем запись в ChangeLog.

**Фаза 3 — Расширенный backend:**
Бюджеты с расчётом прогресса, повторяющиеся правила (node-cron), импорт/экспорт
CSV, дашборд со статистикой, Swagger документация.

---

### Сессия 2 — Тесты, Frontend, Docker (2026-06-08)

**Фаза 4 — Тесты:**

Написали 4 тест-сьюта (auth, categories, transactions, dashboard), 18 тестов.
Путь был непростым — столкнулись с несколькими проблемами подряд.

**Фаза 5 — Frontend:**

Next.js 14 App Router, адаптивный интерфейс (сайдбар на desktop,
bottom nav на mobile). 7 страниц: лендинг, логин, регистрация, дашборд с
графиками, транзакции, бюджеты, категории, повторяющиеся правила.

---

### Сессия 3 — Автосид, pgAdmin (2026-06-09)

Обнаружили что после `docker-compose up -d` нельзя войти — seed не
запускался автоматически. Исправили: добавили вызов seed в Dockerfile CMD,
сделали seed идемпотентным. Добавили pgAdmin для просмотра БД.

---

## Ключевые проблемы и решения

### 1. Prisma.JsonNull недоступен в тестах

**Проблема:** В тестах `@prisma/client` мокируется, и `Prisma.JsonNull`
недоступен. Код падал при попытке передать `before: Prisma.JsonNull`.

**Решение:** Убрали `before` и `after` из объектов создания транзакций —
поля опциональные в схеме, их можно просто не передавать.

**Вывод:** Не передавай `null` в nullable JSON-поля Prisma — просто опускай поле.

---

### 2. csv-parser — нет named export

**Проблема:** `import { parse } from 'csv-parser'` — ошибка компиляции,
такого экспорта нет.

**Решение:** `import csvParser from 'csv-parser'` — только default export.

---

### 3. JWT_SECRET undefined в тестах

**Проблема:** Тесты падали с "JWT_SECRET is not defined" — переменные
окружения не загружались.

**Решение:** Создали `tests/setup.ts` с `process.env.JWT_SECRET = '...'`
и добавили его в `jest.config.ts` → `setupFiles`.

---

### 4. Dashboard — 404 в тестах

**Проблема:** Тест делал запрос на `/api/dashboard/stats`, а роут
зарегистрирован как `/api/dashboard`.

**Решение:** Исправили URL в тесте. Урок: всегда сверяй тестовые URL
с фактической регистрацией роутов в `index.ts`.

---

### 5. Несовместимость тома PostgreSQL PG15 vs PG16

**Проблема:** При первом запуске Docker скачал postgres:15, создал том.
После изменений в compose том остался с данными PG16 (или наоборот),
и контейнер не стартовал.

**Решение:** `docker-compose down -v` — удалить тома и пересоздать с нуля.

---

### 6. NEXT_PUBLIC_* переменные не работали в Docker

**Проблема:** Переменная `NEXT_PUBLIC_API_URL` передавалась через
`environment:` в docker-compose, но в браузере была `undefined`.

**Причина:** Next.js вшивает `NEXT_PUBLIC_*` переменные в код на этапе
**сборки** (build time), а не в рантайме. В Docker образ уже собран — переменная
не попадает.

**Решение:** Перенесли в `build.args` в docker-compose + `ARG` в Dockerfile:
```dockerfile
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
```

**Вывод:** Это фундаментальная особенность Next.js — важно знать заранее.

---

### 7. OpenSSL отсутствует на Alpine

**Проблема:** Prisma не запускался в Docker — `Error: Could not find OpenSSL`.

**Решение:** Добавили в Dockerfile (обе стадии):
```dockerfile
RUN apk add --no-cache openssl
```

---

### 8. npm ci падал в frontend Dockerfile

**Проблема:** `npm ci` требует точного соответствия `package-lock.json`,
которое нарушается при разных версиях Node.

**Решение:** Заменили на `npm install` во frontend Dockerfile.

---

### 9. ESLint и TypeScript блокировали Docker build

**Проблема:** `next build` падал из-за ESLint ошибок и TypeScript warnings
(особенно типы Recharts).

**Решение:** В `next.config.mjs`:
```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```

---

### 10. Конфликт роутов в Next.js App Router

**Проблема:** Существовал `app/page.tsx` (пустой) и
`app/(dashboard)/page.tsx` — Next.js конфликтовал при сборке.

**Решение:** Удалили `app/(dashboard)/page.tsx`, создали лендинг в
`app/page.tsx`, дашборд перенесли в `app/(dashboard)/dashboard/page.tsx`.

**Вывод:** Route groups `(name)` не добавляют сегмент к URL — это просто
способ группировки с общим layout.

---

### 11. Seed не запускался автоматически в Docker

**Проблема:** После `docker-compose up -d` нельзя было войти — данные
отсутствовали. Нужно было вручную запускать `npm run db:seed`.

**Решение:**
1. Сделали seed идемпотентным (проверяет наличие пользователя перед вставкой)
2. Добавили вызов в Dockerfile:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed/index.js && node dist/index.js"]
```

---

### 12. pgAdmin — chmod на read-only файле

**Проблема:** Монтировали `pgpass` файл как `:ro` и пытались сделать
`chmod 600` — получали `Read-only file system`.

**Решение:** Копируем файл в `/tmp` при старте контейнера:
```yaml
entrypoint: ["/bin/sh", "-c", "cp /pgadmin4/pgpass /tmp/pgpass && chmod 600 /tmp/pgpass && /entrypoint.sh"]
```

---

## Удачные решения

**Route Groups в Next.js** — папки `(auth)` и `(dashboard)` дали чистые URL
(`/login`, `/dashboard`) и разные layouts без усложнения структуры.

**Идемпотентный seed** — проверка существования данных перед вставкой позволила
безопасно вызывать seed при каждом старте контейнера.

**Multi-stage Dockerfile** — раздельные стадии builder/runner уменьшили
итоговый размер образа, не включая dev-зависимости.

**healthcheck в docker-compose** — `condition: service_healthy` для db
гарантирует что backend стартует только после готовности PostgreSQL.

---

## Неудачные шаги

**Попытка использовать Prisma.JsonNull в тестах** — потратили время на
отладку, решение оказалось проще: просто не передавать поле.

**runtime environment для NEXT_PUBLIC_*** — не учли особенность Next.js
с build-time переменными, пришлось переделывать Dockerfile и compose.

**npm ci во frontend** — стандартная рекомендация для production,
но в данном случае несовместима из-за расхождений в lock-файле.

---

## AI-инструменты в разработке проекта

### Используемые инструменты

**Claude (Anthropic) через Claude Code CLI** — основной инструмент на всех этапах:
- Проектирование архитектуры и схемы БД
- Генерация backend-кода (Express-роуты, Prisma-схема, middleware)
- Генерация frontend-кода (Next.js страницы, компоненты Recharts)
- Написание тестов (Jest + Supertest)
- Настройка Docker, docker-compose, GitHub Actions CI
- Отладка ошибок — Claude анализировал стектрейсы и предлагал исправления

Весь проект создан в диалоге с AI: человек описывал требование или проблему, Claude генерировал решение, человек проверял результат в браузере/терминале.

---

### Пример промпта с разбором

**Контекст:** На этапе фазы 3 нужно было реализовать импорт транзакций из CSV-файла.

**Промпт:**
> Реализуй POST /api/csv/import — принимает CSV-файл (multipart/form-data), парсит его с помощью csv-parser, создаёт транзакции в БД. Формат CSV: amount, date (YYYY-MM-DD), type (INCOME/EXPENSE), categoryId, description (опционально). Возвращай количество созданных и количество строк с ошибками. Добавь валидацию каждой строки через zod.

**Что Claude сделал:**
1. Добавил `multer` для обработки multipart/form-data
2. Настроил `csv-parser` для стримингового парсинга
3. Применил zod-валидацию к каждой строке независимо
4. Обернул каждую вставку в try/catch — ошибка в одной строке не прерывает весь импорт
5. Добавил JSDoc-аннотации для Swagger

**Проблема, возникшая при выполнении:**
Claude использовал `import { parse } from 'csv-parser'` — named export, которого не существует. TypeScript-компилятор упал с ошибкой. После того как я показал ошибку в чате, Claude исправил на `import csvParser from 'csv-parser'` (default export) и объяснил причину.

**Вывод:** AI хорошо справляется с генерацией структуры и логики, но иногда ошибается в деталях API сторонних библиотек. Итеративный подход — сгенерировать, запустить, показать ошибку — работает эффективно.
