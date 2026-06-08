import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function monthStart(monthsAgo: number): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

function monthEnd(monthsAgo: number): Date {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo + 1);
  d.setHours(23, 59, 59, 999);
  d.setDate(0);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Очистка в обратном порядке зависимостей
  await prisma.changeLog.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.currency.deleteMany();

  // ─── Валюты ───────────────────────────────────────────────
  await prisma.currency.createMany({
    data: [
      { code: 'RUB', name: 'Российский рубль',  symbol: '₽', rateToBase: 1.0    },
      { code: 'USD', name: 'Доллар США',         symbol: '$', rateToBase: 0.011  },
      { code: 'EUR', name: 'Евро',               symbol: '€', rateToBase: 0.010  },
      { code: 'CNY', name: 'Китайский юань',     symbol: '¥', rateToBase: 0.080  },
      { code: 'GBP', name: 'Фунт стерлингов',   symbol: '£', rateToBase: 0.0087 },
    ],
  });
  console.log('✅ Currencies created');

  // ─── Пользователи ─────────────────────────────────────────
  const hash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: { email: 'alice@finance.demo', passwordHash: hash, name: 'Alice (личный)', baseCurrency: 'RUB' },
  });
  const family = await prisma.user.create({
    data: { email: 'family@finance.demo', passwordHash: hash, name: 'Family (семейный)', baseCurrency: 'RUB' },
  });
  console.log('✅ Users created');

  // ─── Категории ────────────────────────────────────────────
  const categoriesData = [
    { name: 'Продукты',            icon: '🛒', color: '#22c55e' },
    { name: 'Транспорт',           icon: '🚗', color: '#3b82f6' },
    { name: 'Рестораны',           icon: '☕', color: '#f59e0b' },
    { name: 'Развлечения',         icon: '🎬', color: '#8b5cf6' },
    { name: 'Здоровье',            icon: '💊', color: '#ef4444' },
    { name: 'Одежда',              icon: '👔', color: '#ec4899' },
    { name: 'Коммунальные услуги', icon: '🏠', color: '#06b6d4' },
    { name: 'Связь',               icon: '📱', color: '#84cc16' },
    { name: 'Образование',         icon: '📚', color: '#f97316' },
    { name: 'Путешествия',         icon: '✈️', color: '#14b8a6' },
    { name: 'Зарплата',            icon: '💰', color: '#10b981' },
    { name: 'Подарки',             icon: '🎁', color: '#a855f7' },
  ];

  const aliceCategories = await Promise.all(
    categoriesData.map((c) => prisma.category.create({ data: { ...c, userId: alice.id } }))
  );
  const familyCategories = await Promise.all(
    categoriesData.map((c) => prisma.category.create({ data: { ...c, userId: family.id } }))
  );
  console.log('✅ Categories created');

  // ─── Транзакции ───────────────────────────────────────────
  const expenseTemplates = [
    { idx: 0,  min: 800,  max: 3500, perMonth: 8 }, // Продукты
    { idx: 1,  min: 50,   max: 500,  perMonth: 6 }, // Транспорт
    { idx: 2,  min: 300,  max: 2500, perMonth: 5 }, // Рестораны
    { idx: 3,  min: 200,  max: 1500, perMonth: 3 }, // Развлечения
    { idx: 4,  min: 500,  max: 3000, perMonth: 2 }, // Здоровье
    { idx: 5,  min: 1000, max: 8000, perMonth: 1 }, // Одежда
    { idx: 6,  min: 3000, max: 6000, perMonth: 1 }, // Коммуналка
    { idx: 7,  min: 400,  max: 900,  perMonth: 1 }, // Связь
    { idx: 8,  min: 1000, max: 5000, perMonth: 1 }, // Образование
    { idx: 11, min: 500,  max: 5000, perMonth: 1 }, // Подарки
  ];

  const descriptions: Record<number, string[]> = {
    0:  ['Пятёрочка', 'ВкусВилл', 'Магнит', 'Перекрёсток', 'Лента', 'Рынок'],
    1:  ['Метро', 'Яндекс.Такси', 'Самокат', 'Парковка', 'Бензин', 'Каршеринг'],
    2:  ['Кофейня', 'Суши', 'Пицца', 'Бизнес-ланч', 'Ресторан', 'Фастфуд'],
    3:  ['Кино', 'Концерт', 'Netflix', 'Spotify', 'Игры', 'Музей'],
    4:  ['Аптека', 'Стоматолог', 'Анализы', 'Витамины', 'Массаж'],
    5:  ['Zara', 'Kari', 'Wildberries', 'Lamoda', 'H&M'],
    6:  ['Электричество', 'Вода', 'Газ', 'Интернет', 'ЖКХ'],
    7:  ['МТС', 'Beeline', 'Мегафон', 'Tele2'],
    8:  ['Курсы', 'Книги', 'Udemy', 'Coursera', 'Учебники'],
    9:  ['Авиабилеты', 'Отель', 'Тур', 'Экскурсия'],
    10: ['Зарплата', 'Аванс', 'Премия', 'Фриланс'],
    11: ['Подарок другу', 'День рождения', 'Праздник', 'Сувенир'],
  };

  let txCount = 0;

  for (const [user, cats] of [[alice, aliceCategories], [family, familyCategories]] as const) {
    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const start = monthStart(monthsAgo);
      const end = monthEnd(monthsAgo);

      // Зарплата в начале месяца
      const salaryDate = new Date(start);
      salaryDate.setDate(5 + Math.floor(Math.random() * 3));
      await prisma.transaction.create({
        data: {
          userId: user.id,
          categoryId: cats[10].id,
          amount: user.id === alice.id ? randomBetween(85000, 95000) : randomBetween(120000, 140000),
          date: salaryDate,
          type: 'INCOME',
          description: descriptions[10][Math.floor(Math.random() * descriptions[10].length)],
          currency: 'RUB',
          exchangeRate: 1.0,
        },
      });
      txCount++;

      // Расходы по шаблонам
      for (const tmpl of expenseTemplates) {
        for (let i = 0; i < tmpl.perMonth; i++) {
          const descList = descriptions[tmpl.idx] ?? ['Покупка'];
          await prisma.transaction.create({
            data: {
              userId: user.id,
              categoryId: cats[tmpl.idx].id,
              amount: randomBetween(tmpl.min, tmpl.max),
              date: randomDate(start, end),
              type: 'EXPENSE',
              description: descList[Math.floor(Math.random() * descList.length)],
              currency: 'RUB',
              exchangeRate: 1.0,
            },
          });
          txCount++;
        }
      }

      // Транзакция в USD раз в 2 месяца (путешествия)
      if (monthsAgo % 2 === 0) {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            categoryId: cats[9].id,
            amount: randomBetween(50, 300),
            date: randomDate(start, end),
            type: 'EXPENSE',
            description: 'Booking.com',
            currency: 'USD',
            exchangeRate: 0.011,
          },
        });
        txCount++;
      }
    }
  }
  console.log(`✅ Transactions created: ${txCount}`);

  // ─── Бюджеты (текущий месяц) ──────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7);

  for (const [user, cats] of [[alice, aliceCategories], [family, familyCategories]] as const) {
    await prisma.budget.createMany({
      data: [
        { userId: user.id, categoryId: cats[0].id, month: currentMonth, limitAmount: 20000 },
        { userId: user.id, categoryId: cats[2].id, month: currentMonth, limitAmount: 10000 },
        { userId: user.id, categoryId: cats[6].id, month: currentMonth, limitAmount: 7000  },
      ],
    });
  }
  console.log('✅ Budgets created');

  // ─── Повторяющиеся правила ────────────────────────────────
  const nextMonth5  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5);
  const nextMonth15 = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15);
  const nextMonth20 = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 20);

  for (const [user, cats] of [[alice, aliceCategories], [family, familyCategories]] as const) {
    await prisma.recurringRule.createMany({
      data: [
        {
          userId: user.id,
          categoryId: cats[10].id,
          amount: user.id === alice.id ? 90000 : 130000,
          type: 'INCOME',
          description: 'Зарплата',
          dayOfMonth: 5,
          currency: 'RUB',
          nextRunDate: nextMonth5,
          isActive: true,
        },
        {
          userId: user.id,
          categoryId: cats[7].id,
          amount: 600,
          type: 'EXPENSE',
          description: 'Мобильная связь',
          dayOfMonth: 15,
          currency: 'RUB',
          nextRunDate: nextMonth15,
          isActive: true,
        },
        {
          userId: user.id,
          categoryId: cats[3].id,
          amount: 799,
          type: 'EXPENSE',
          description: 'Netflix подписка',
          dayOfMonth: 20,
          currency: 'RUB',
          nextRunDate: nextMonth20,
          isActive: true,
        },
      ],
    });
  }
  console.log('✅ Recurring rules created');

  console.log('\n🎉 Seed completed!');
  console.log('📧 alice@finance.demo   / password123');
  console.log('📧 family@finance.demo  / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
