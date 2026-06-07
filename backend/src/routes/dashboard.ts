import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: "Format: YYYY-MM. Defaults to current month"
 *     responses:
 *       200:
 *         description: Dashboard data including charts and summary
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split('-').map(Number);

  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59);

  // 1. Итоги текущего месяца
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: req.userId, type: 'INCOME', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: req.userId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);

  // 2. Круговая диаграмма — расходы по категориям за месяц
  const expensesByCategory = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId: req.userId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const categoryIds = expensesByCategory.map((e) => e.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const pieChart = expensesByCategory.map((e) => {
    const cat = categoryMap.get(e.categoryId);
    return {
      categoryId: e.categoryId,
      name: cat?.name ?? 'Unknown',
      icon: cat?.icon ?? '💰',
      color: cat?.color ?? '#6366f1',
      amount: Number(e._sum.amount ?? 0),
    };
  });

  // 3. Топ-5 категорий расходов
  const top5 = pieChart.slice(0, 5);

  // 4. Линейный график — доходы и расходы за последние 6 месяцев
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, mon - 1 - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label, start, end });
  }

  const lineChart = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId: req.userId, type: 'INCOME', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId: req.userId, type: 'EXPENSE', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      return {
        month: label,
        income: Number(inc._sum.amount ?? 0),
        expense: Number(exp._sum.amount ?? 0),
      };
    })
  );

  res.json({
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      month,
    },
    pieChart,
    top5,
    lineChart,
  });
});

export default router;
